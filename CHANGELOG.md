# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## 3.0.0

### English

#### ✨ Added
- Added last-view-date frontmatter sync with configurable property name and date format
- Added zh-CN localization for the settings UI

#### 🔄 Changed
- Refactored settings UI into grouped sections with `SettingGroup` and backward-compatible fallback
- Improved excluded-path input: switched to textarea, supports comma/newline separators

#### 🐛 Fixed
- Fixed `Skip new notes` behavior so first open of new notes is properly skipped
- Fixed issue where new notes could unexpectedly start with `view_count: 2`
- Fixed issue where changing count method refreshed `viewed_at` on all notes
- Fixed EventManager singleton cleanup on plugin unload

### 中文

#### ✨ 新增
- 新增“最后查看日期”同步能力，可自定义属性名与日期格式
- 设置页新增 zh-CN 文案支持

#### 🔄 变更
- 设置页重构为分组结构，采用 `SettingGroup`，并提供低版本兼容 fallback
- 排除路径输入改为 textarea，并支持逗号/换行分隔

#### 🐛 修复
- 修复 `Skip new notes`，新建笔记首次打开可正确跳过
- 修复新建笔记可能直接出现 `view_count: 2` 的问题
- 修复修改计数方式时会刷新全部笔记 `viewed_at` 的问题
- 修复 EventManager 单例在插件卸载时的清理问题
