# Mobile Manual Verification

M6 Flutter Mobile 已完成代码层,本文档是真机/模拟器端到端验证清单。

适用环境: macOS + iOS Simulator + Android Emulator,不依赖 Docker。

---

## 前置工具

| 工具 | 用途 | 验证命令 |
|---|---|---|
| Flutter SDK ≥ 3.x | mobile 构建 | `flutter doctor` |
| Xcode + iOS Simulator | iOS 验证 | `xcrun simctl list devices` |
| Android Studio + AVD | Android 验证 | `adb devices` |
| Homebrew | 起本地 PG/MySQL | `brew --version` |

---

## 起本地数据库服务

### PostgreSQL

```bash
brew install postgresql@16
brew services start postgresql@16
createdb datapilot_demo
```

灌入 seed:

```bash
psql datapilot_demo <<'SQL'
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  amount NUMERIC(10,2),
  status TEXT
);
INSERT INTO users (name, email) VALUES
  ('Alice', 'alice@example.com'),
  ('Bob', 'bob@example.com'),
  ('Carol', 'carol@example.com');
INSERT INTO orders (user_id, amount, status) VALUES
  (1, 99.50, 'paid'), (1, 12.00, 'refunded'),
  (2, 250.00, 'paid'), (3, 7.80, 'pending');
SQL
```

### MySQL

```bash
brew install mysql
brew services start mysql
mysql -uroot -e "CREATE DATABASE datapilot_demo; CREATE USER 'datapilot'@'%' IDENTIFIED BY 'datapilot'; GRANT ALL ON datapilot_demo.* TO 'datapilot'@'%'; FLUSH PRIVILEGES;"
```

灌入 seed:

```bash
mysql -uroot datapilot_demo <<'SQL'
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  email VARCHAR(128) UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  amount DECIMAL(10,2),
  status VARCHAR(32),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
INSERT INTO users (name, email) VALUES
  ('Alice', 'alice@example.com'),
  ('Bob', 'bob@example.com'),
  ('Carol', 'carol@example.com');
INSERT INTO orders (user_id, amount, status) VALUES
  (1, 99.50, 'paid'), (1, 12.00, 'refunded'),
  (2, 250.00, 'paid'), (3, 7.80, 'pending');
SQL
```

---

## 模拟器访问宿主机的地址

| 模拟器 | host 字段 |
|---|---|
| iOS Simulator | `localhost` 或 `127.0.0.1` |
| Android Emulator | `10.0.2.2` |

Postgres SSL 注意: brew 装的 PG 默认没启 SSL,mobile 端 `sslMode` 必须设为 `disable`,否则连接失败。

---

## 启动 mobile

```bash
cd apps/mobile
flutter pub get
flutter run                # 自动选当前活跃模拟器
flutter run -d <device-id> # 指定设备
```

---

## 5 个 Screen 验证 Checklist

### ConnectionsScreen

- [ ] 空状态: 首次进入显示 EmptyState,文案"暂无连接"
- [ ] 新建 Postgres: 填 host/port/db/user,密码,sslMode=disable,readonly 默认 ON → 保存成功
- [ ] 新建 MySQL: 同上 → 保存成功
- [ ] 新建 SQLite: 见下方 "SQLite 已知 UX 限制"
- [ ] 编辑连接: 改 name → 保存生效
- [ ] 删除连接: 二次确认 dialog → 列表消失
- [ ] 测试连接: tap 连接卡片或长按菜单 → 显示成功/失败 SnackBar

### QueryScreen

- [ ] 连接 dropdown: 切换 Postgres/MySQL,SqlEditor 可输入
- [ ] 执行 SELECT: `SELECT * FROM users` → ResultsTable 显示 3 行,duration 显示
- [ ] 列限制: 执行 `SELECT * FROM users CROSS JOIN orders` 不爆,driver 硬截 1000 行(看 SnackBar 提示)
- [ ] 收藏: 输入 sql + tap 收藏按钮 → 弹起名 dialog → 保存
- [ ] 复制结果: tap 复制按钮 → 验证剪贴板有 TSV
- [ ] **风险闸门 — readonly 阻断**: readonly=ON 时执行 `DELETE FROM users WHERE id=999` → 直接阻断,提示"只读连接"
- [ ] **风险闸门 — warning**: readonly=OFF + 执行 `UPDATE users SET name='X' WHERE id=1` → 触发生物认证(或 Debug 跳过) + 二次确认 dialog → 通过后才执行
- [ ] **风险闸门 — danger**: 执行 `DROP TABLE orders` → 同上更严格的确认文案
- [ ] 错误展示: 故意写错 SQL → 红色错误块显示驱动错误

### HistoryScreen

- [ ] 历史 Tab: 看到上面执行过的 SQL,带时间戳和连接名
- [ ] 收藏 Tab: 切到收藏,看到上面收藏过的 SQL
- [ ] 回填: tap 历史项 → 自动切到 Query Tab,SqlEditor 填入对应 SQL
- [ ] 清空: 长按或菜单 → 二次确认 → 清空当前连接历史
- [ ] 跨连接隔离: 切到另一个连接,历史列表为该连接独有

### AiScreen

前置: 在 Settings 配好 AI baseURL/model/apiKey(用 OpenAI 兼容端点)。

- [ ] SegmentedButton 4 个 action: generate / explain / optimize / repair
- [ ] **generate**: 输入"查所有付费订单的用户" → 返回 SQL → tap 复制
- [ ] **explain**: 粘一段 SQL → 返回中文解释
- [ ] **optimize**: 粘一段 SQL → 返回优化建议
- [ ] **repair**: 粘错误 SQL + 错误消息 → 返回修复版
- [ ] 发送到 Query: tap "发送到查询" → 切到 Query Tab,SqlEditor 填入生成的 SQL
- [ ] 错误处理: 故意配错 apiKey → 红色错误块显示 HTTP 错误

### SettingsScreen

- [ ] AI 配置: baseURL/model/apiKey 输入 → 保存后重新进入仍存在(apiKey 走 SecureStorage)
- [ ] 生物认证测试: tap "测试" → 触发 Face ID / Touch ID(模拟器需在菜单中模拟 Face ID 匹配)
- [ ] Debug 跳过生物认证: 开关打开后,QueryScreen 风险操作不会再唤起认证(仅 Debug 构建)
- [ ] 清除所有数据: tap → 二次确认 → 连接/历史/收藏/AI 配置全清 → 提示"已清除全部数据,请重启应用"
- [ ] 关于: 显示版本号 + 链接(可选)

---

## SQLite 已知 UX 限制

mobile 端 `apps/mobile/lib/widgets/connection_form_dialog.dart:147` 把 SQLite filePath 做成纯文本框,要求用户手动填写文件路径。模拟器内部路径用户拿不到,所以验证 SQLite 需要 workaround:

### iOS Simulator

```bash
xcrun simctl get_app_container booted ai.csap.datapilot data
# 例如返回 /Users/you/Library/Developer/CoreSimulator/Devices/<UUID>/data/Containers/Data/Application/<APP_UUID>
cp seed.db <返回路径>/Documents/seed.db
```

mobile 端 filePath 填: `<返回路径>/Documents/seed.db` 的绝对路径。

### Android Emulator

```bash
adb push seed.db /data/local/tmp/seed.db
adb shell run-as ai.csap.datapilot cp /data/local/tmp/seed.db files/seed.db
```

mobile 端 filePath 填 app 私有目录,可在 mobile 启动日志里 grep `getApplicationDocumentsDirectory` 看到路径。

### 后续改进建议

加 `file_picker` 依赖 + connection_form_dialog 里 SQLite 类型分支提供文件选择按钮,跳过手填路径流程。未列入 M7 backlog,可在跑通本 checklist 后单独立项。

---

## 完成判定

5 个 screen 的所有 [ ] 项勾完 → M6 真机验证通过。

未通过项: 记录到 `docs/EXECUTION_PROGRESS.md` 当作 M7 候选 bug。
