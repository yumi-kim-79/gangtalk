#!/usr/bin/env ruby
# GoogleService-Info.plist 를 Xcode 프로젝트(GangTalk 타겟)에 등록한다.
# Xcode 에서 드래그해 넣는 작업과 동일하지만 Target 체크 누락 실수를 방지한다.
#
#   cd ~/GangTalk/app && bundle exec ruby ../scripts/add-ios-plist.rb
#
# 이미 등록돼 있으면 아무것도 하지 않는다 (여러 번 실행해도 안전).

require 'xcodeproj'

REPO_ROOT   = File.expand_path('..', __dir__)
PROJECT     = File.join(REPO_ROOT, 'app/ios/GangTalk.xcodeproj')
TARGET_NAME = 'GangTalk'
FILE_NAME   = 'GoogleService-Info.plist'
FILE_PATH   = File.join(REPO_ROOT, 'app/ios/GangTalk', FILE_NAME)

abort "❌ #{FILE_PATH} 가 없습니다. Firebase 콘솔에서 받아 먼저 배치하세요." unless File.exist?(FILE_PATH)

project = Xcodeproj::Project.open(PROJECT)
target  = project.targets.find { |t| t.name == TARGET_NAME }
abort "❌ 타겟 '#{TARGET_NAME}' 을 찾을 수 없습니다." if target.nil?

if target.resources_build_phase.files.any? { |f| f.file_ref&.path&.end_with?(FILE_NAME) }
  puts "✅ 이미 등록돼 있습니다 — 변경 없음"
  exit 0
end

group = project.main_group.find_subpath(TARGET_NAME, true)
group.set_source_tree('SOURCE_ROOT')

file_ref = group.files.find { |f| f.path&.end_with?(FILE_NAME) }
file_ref ||= group.new_reference(FILE_PATH)

target.add_resources([file_ref])
project.save

puts "✅ #{FILE_NAME} 을 '#{TARGET_NAME}' 타겟 리소스에 추가했습니다"
