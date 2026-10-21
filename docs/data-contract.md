# Quy ước dữ liệu chung

Các module dùng `window.StudyFlowStorage.read(key)` và `.write(key, value)` từ `js/storage.js`. `read` trả về mảng rỗng khi khóa chưa tồn tại. Dữ liệu lưu theo một người dùng trên trình duyệt hiện tại; chưa có tài khoản hoặc đồng bộ máy.

## `studyflow_tasks` – mảng bài tập

```json
[{"id":"task-1","title":"Ôn Java","subject":"Java","dueDate":"2026-10-20","priority":"high","completed":false}]
```

`id` là chuỗi duy nhất; `dueDate` có dạng `YYYY-MM-DD`; `priority` là `low`, `medium` hoặc `high`; `completed` là boolean.

## `studyflow_events` – mảng sự kiện

```json
[{"id":"event-1","title":"Thi giữa kỳ","subject":"Java","date":"2026-10-22","time":"09:00","location":"B201"}]
```

`date` dùng `YYYY-MM-DD`; `time` dùng `HH:mm` theo giờ địa phương.

## `studyflow_sessions` – mảng phiên học hoàn thành

```json
[{"id":"session-1","subject":"Java","completedAt":"2026-10-20T10:25:00.000Z","durationMinutes":25}]
```

Chỉ ghi phiên focus hoàn thành; `completedAt` là ISO 8601. Dashboard và Analytics đọc các khóa này, không tự tạo dữ liệu khác định dạng. Nếu cần đổi schema, cập nhật tài liệu trong PR và thông báo cả nhóm.

## `studyflow_goals` – mảng mục tiêu học tập (Analytics)

```json
[{"id":"goal-1","type":"weekly-minutes","target":300,"subject":"Java","createdAt":"2026-10-20T10:00:00.000Z"}]
```

Chỉ Analytics ghi khóa này. `type` là `weekly-minutes` (phút học trong tuần, tính từ thứ Hai), `daily-minutes` (phút học hôm nay) hoặc `completed-tasks` (số bài tập đã hoàn thành); `target` là số nguyên dương; `subject` là chuỗi rỗng khi áp dụng cho mọi môn. Tiến độ được tính từ `studyflow_sessions` và `studyflow_tasks`, không lưu lại.
