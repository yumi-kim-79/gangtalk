import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { CATEGORY_TEMPLATES, BOT_NAMES, pick, randInt } from "./sim-templates.js";

admin.initializeApp();
const db = admin.firestore();

// 설정 문서: simulator/config
// 예시 기본값(문서 없을 때 사용)
const DEFAULT_CONFIG = {
  enabled: false, // 기본은 꺼두고, 문서에서 true로 전환
  timezone: "Asia/Seoul",
  // 카테고리별 일일 글 최대 수/간격(초)
  categories: {
    daily:  { dailyCap: 12, minGapSec: 900,  maxGapSec: 3600 },
    suggest:{ dailyCap: 4,  minGapSec: 1800, maxGapSec: 7200 },
    pledge: { dailyCap: 6,  minGapSec: 1800, maxGapSec: 5400 },
    travel: { dailyCap: 6,  minGapSec: 1800, maxGapSec: 5400 },
    health: { dailyCap: 6,  minGapSec: 1800, maxGapSec: 5400 },
    quote:  { dailyCap: 6,  minGapSec: 1200, maxGapSec: 5400 },
    vote:   { dailyCap: 3,  minGapSec: 3600, maxGapSec: 10800 },
    quiz:   { dailyCap: 3,  minGapSec: 3600, maxGapSec: 10800 },
    event:  { dailyCap: 2,  minGapSec: 7200, maxGapSec: 21600 }
  },
  // 댓글/대댓글 생성 확률 및 개수 범위
  comments: {
    initialMin: 0,
    initialMax: 3,
    laterMin: 0,
    laterMax: 4,
    replyChance: 0.5 // 각 댓글마다 대댓글 생성 확률
  },
  // 다음 글 생성 예정시각 기록 위치
  scheduleDocPath: "simulator/schedule",
  // 지연 댓글 작업 큐
  jobsColPath: "simulator_jobs",
};

// 오늘 00:00(로컬 타임존) 타임스탬프
function startOfToday(tz) {
  const now = new Date();
  const iso = now.toLocaleString("sv-SE", { timeZone: tz }).replace(" ", "T");
  const today = new Date(iso);
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

// 카테고리별 오늘 생성 수 카운트
async function countTodayPosts(category, tz) {
  const since = startOfToday(tz);
  const snap = await db.collection("board_posts")
    .where("category", "==", category)
    .where("isSynthetic", "==", true)
    .where("createdAtMs", ">=", since)
    .count().get();
  return snap.data().count || 0;
}

function nextGapMs(minSec, maxSec) {
  return randInt(minSec, maxSec) * 1000;
}

async function readConfig() {
  const ref = db.doc("simulator/config");
  const snap = await ref.get();
  if (!snap.exists) return DEFAULT_CONFIG;
  return { ...DEFAULT_CONFIG, ...snap.data() };
}

async function readSchedule(docPath) {
  const ref = db.doc(docPath);
  const snap = await ref.get();
  return snap.exists ? snap.data() : {};
}

async function writeSchedule(docPath, data) {
  await db.doc(docPath).set(data, { merge: true });
}

// 글 생성
async function createPost(category, cfg) {
  const t = Date.now();
  const author = pick(BOT_NAMES);
  const col = db.collection("board_posts");

  if (category === "vote") {
    const [a, b] = pick(CATEGORY_TEMPLATES.vote.ab);
    const title = pick(CATEGORY_TEMPLATES.vote.titles);
    const doc = {
      category: "vote",
      title,
      subtitle: `${a} vs ${b}`,
      optA: a, optB: b,
      votesA: 0, votesB: 0,
      views: 0, likes: 0,
      author, authorUid: "sim-bot",
      isSynthetic: true,
      simScenario: "vote",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAtMs: t,
      updatedAtMs: t
    };
    const ref = await col.add(doc);
    return { id: ref.id, doc };
  }

  // 일반/힐링/이벤트 등
  const lib = CATEGORY_TEMPLATES[category] || CATEGORY_TEMPLATES.daily;
  const title = pick(lib.titles);
  const body = pick(lib.bodies);

  const doc = {
    category,
    title,
    subtitle: "",
    body,
    content: body,
    views: 0, likes: 0, cmtCount: 0,
    author, authorUid: "sim-bot",
    isSynthetic: true,
    simScenario: category,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: t,
    updatedAtMs: t
  };

  const ref = await col.add(doc);
  return { id: ref.id, doc };
}

// 즉시 댓글 N개
async function seedComments(postId, category, cfg) {
  const lib = CATEGORY_TEMPLATES[category] || CATEGORY_TEMPLATES.daily;
  const min = cfg.comments.initialMin;
  const max = Math.max(cfg.comments.initialMin, cfg.comments.initialMax);
  const count = randInt(min, max);
  if (count <= 0) return 0;

  const batch = db.batch();
  const col = db.collection("board_posts").doc(postId).collection("comments");
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const body = pick(lib.comments);
    const ref = col.doc();
    batch.set(ref, {
      body,
      author: pick(BOT_NAMES),
      authorUid: "sim-bot",
      isSynthetic: true,
      parentId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAtMs: now,
      updatedAtMs: now
    });
  }

  // cmtCount 반영
  batch.update(db.collection("board_posts").doc(postId), {
    cmtCount: admin.firestore.FieldValue.increment(count),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAtMs: now
  });

  await batch.commit();
  return count;
}

// 지연 댓글 작업 enqueue
async function enqueueLaterComments(postId, category, cfg, tz) {
  const lib = CATEGORY_TEMPLATES[category] || CATEGORY_TEMPLATES.daily;
  const min = cfg.comments.laterMin;
  const max = Math.max(cfg.comments.laterMin, cfg.comments.laterMax);
  const count = randInt(min, max);
  if (count <= 0) return 0;

  const jobs = [];
  for (let i = 0; i < count; i++) {
    const delayMin = randInt(5, 180); // 5~180분 사이 랜덤
    const scheduledAtMs = Date.now() + delayMin * 60 * 1000;
    jobs.push({
      type: "comment",
      postId,
      category,
      body: pick(lib.comments),
      scheduledAtMs,
      createdAtMs: Date.now(),
      done: false
    });

    // 대댓글 확률
    if (Math.random() < (cfg.comments.replyChance ?? 0.5)) {
      const replyDelayMin = delayMin + randInt(1, 60);
      jobs.push({
        type: "reply",
        postId,
        category,
        body: pick(lib.replies),
        scheduledAtMs: Date.now() + replyDelayMin * 60 * 1000,
        createdAtMs: Date.now(),
        done: false
      });
    }
  }
  const col = db.collection(cfg.jobsColPath || DEFAULT_CONFIG.jobsColPath);
  const writes = jobs.map(j => col.add(j));
  await Promise.all(writes);
  return jobs.length;
}

// due jobs 처리
async function processDueJobs(cfg) {
  const now = Date.now();
  const col = db.collection(cfg.jobsColPath || DEFAULT_CONFIG.jobsColPath);
  const snap = await col.where("done", "==", false)
                        .where("scheduledAtMs", "<=", now)
                        .limit(30)
                        .get();
  if (snap.empty) return 0;

  let processed = 0;

  for (const d of snap.docs) {
    const job = d.data();
    try {
      const postRef = db.collection("board_posts").doc(job.postId);
      const postSnap = await postRef.get();
      if (!postSnap.exists) {
        await d.ref.update({ done: true, error: "post_not_found" });
        continue;
      }
      const lib = CATEGORY_TEMPLATES[job.category] || CATEGORY_TEMPLATES.daily;
      const body = job.body || pick(lib.comments);
      const cCol = postRef.collection("comments");

      if (job.type === "comment") {
        const cRef = await cCol.add({
          body,
          author: pick(BOT_NAMES),
          authorUid: "sim-bot",
          isSynthetic: true,
          parentId: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAtMs: now,
          updatedAtMs: now
        });
        await postRef.update({
          cmtCount: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAtMs: now
        });

        // 대댓글 job이 있고 parentId 없을 수 있으니, 간단히 일부 reply job에 parentId 주입
        await d.ref.update({ done: true, commentId: cRef.id });
      } else if (job.type === "reply") {
        // parent 후보 하나 조회(가장 최근 상위 댓글)
        const parentSnap = await cCol.where("parentId", "==", null)
                                     .orderBy("createdAt", "desc")
                                     .limit(1).get();
        const parentId = parentSnap.empty ? null : parentSnap.docs[0].id;

        await cCol.add({
          body,
          author: pick(BOT_NAMES),
          authorUid: "sim-bot",
          isSynthetic: true,
          parentId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAtMs: now,
          updatedAtMs: now
        });
        await postRef.update({
          cmtCount: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAtMs: now
        });
        await d.ref.update({ done: true });
      } else {
        await d.ref.update({ done: true, error: "unknown_job_type" });
      }

      processed++;
    } catch (e) {
      await d.ref.update({ error: String(e?.message || e), lastTriedAtMs: now });
    }
  }
  return processed;
}

export const tickSimulator = functions.region("asia-northeast3") // 서울 리전
  .pubsub.schedule("* * * * *") // 1분마다
  .timeZone("Asia/Seoul")
  .onRun(async () => {
    const cfg = await readConfig();
    if (!cfg.enabled) return null;

    // 스케줄 상태 읽기
    const schedPath = cfg.scheduleDocPath || DEFAULT_CONFIG.scheduleDocPath;
    const sched = await readSchedule(schedPath);

    // due jobs 먼저 처리
    await processDueJobs(cfg);

    // 카테고리별 생성 여부 판단
    const cats = Object.keys(cfg.categories || DEFAULT_CONFIG.categories);
    for (const cat of cats) {
      const rules = (cfg.categories && cfg.categories[cat]) || DEFAULT_CONFIG.categories[cat];
      if (!rules) continue;

      // 일일 상한
      const createdToday = await countTodayPosts(cat, cfg.timezone || DEFAULT_CONFIG.timezone);
      if (createdToday >= rules.dailyCap) continue;

      const now = Date.now();
      const nextKey = `next_${cat}`;
      const nextAt = Number(sched[nextKey] || 0);
      if (now < nextAt) continue;

      // 생성
      const { id } = await createPost(cat, cfg);

      // 초기 댓글
      await seedComments(id, cat, cfg);

      // 지연 댓글 enqueue
      await enqueueLaterComments(id, cat, cfg, cfg.timezone || DEFAULT_CONFIG.timezone);

      // 다음 생성 시각 예약(랜덤 간격)
      const gap = nextGapMs(rules.minGapSec, rules.maxGapSec);
      sched[nextKey] = now + gap;
    }

    await writeSchedule(schedPath, sched);
    return null;
  });
