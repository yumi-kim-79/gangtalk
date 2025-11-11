# GangTalkMacro/ocr_util.py
import os
from typing import Tuple, Optional
from PIL import Image, ImageOps, ImageFilter
import pytesseract as T
import subprocess

def _build_config(cfg: dict, extra: Optional[str] = None) -> str:
    psm = int(cfg.get("ocr_psm", 6))
    oem = int(cfg.get("ocr_oem", 1))     # LSTM-only 권장
    dpi = int(cfg.get("ocr_dpi", 350))
    tessdata_dir = cfg.get("tessdata_dir", "")

    # 공백 없는 경로이므로 따옴표 없이 전달 (일부 환경에서 인용부호에 민감)
    base = f'--psm {psm} --oem {oem} --dpi {dpi}'
    if tessdata_dir:
        base += f' --tessdata-dir {tessdata_dir}'
    # 사전 off + 공백 보존
    base += ' -c preserve_interword_spaces=1 -c load_system_dawg=0 -c load_freq_dawg=0'
    if extra:
        base += f' {extra}'
    return base

def tesseract_sanity(cfg: dict) -> Tuple[bool, str]:
    binpath = cfg.get("tesseract_path")
    if not binpath or not os.path.exists(binpath):
        return False, "tesseract binary not found"
    try:
        out = subprocess.check_output([binpath, "--version"], stderr=subprocess.STDOUT)
        ver = out.decode("utf-8", "ignore").splitlines()[0].strip()
        return True, ver
    except Exception as e:
        return False, f"exec fail: {e}"

def _preprocess(img: Image.Image, mode: str = "auto") -> Image.Image:
    g = ImageOps.grayscale(img)
    g = g.filter(ImageFilter.MedianFilter(size=3))
    g = ImageOps.autocontrast(g)
    if mode == "bw180":
        return g.point(lambda v: 255 if v > 180 else 0, mode="1")
    if mode == "bw200":
        return g.point(lambda v: 255 if v > 200 else 0, mode="1")
    return g

def ocr_image(img: Image.Image, cfg: dict, binarize: Optional[str] = None) -> str:
    # 1) 실행 파일 강제 지정
    tess = cfg.get("tesseract_path")
    if tess:
        T.pytesseract.tesseract_cmd = tess

    # 2) 환경변수 정리/고정
    #    (다른 곳에서 설정한 값의 간섭 제거)
    os.environ.pop("TESSDATA_PREFIX", None)
    tessdata_dir = cfg.get("tessdata_dir", "")
    if tessdata_dir:
        # 여기서는 tessdata 폴더 자체로 고정 (v5에서도 문제 없음)
        os.environ["TESSDATA_PREFIX"] = tessdata_dir

    lang = cfg.get("ocr_lang", "kor+eng")
    config = _build_config(cfg)

    im = _preprocess(img, binarize or "auto")
    text = T.image_to_string(im, lang=lang, config=config)
    return text.strip()
