# Nhóm 4

StudyFlow là website quản lý học tập tĩnh, dùng HTML, CSS và JavaScript thuần. Dự án gồm Dashboard, Tasks, Calendar, Pomodoro và Analytics; dữ liệu lưu trong `localStorage` của trình duyệt hiện tại.

## Chạy thử và preview

Preview website tại đây: https://kez-de.github.io/StudyFlow/

Nếu muốn chạy local, vào thư mục dự án rồi mở `http://localhost:4173`:

```sh
python3 -m http.server 4173
```

Các liên kết và ảnh dùng đường dẫn tương đối, phù hợp với GitHub Pages.

## Phân công

| Người | Branch | Chức năng | File được sửa |
| --- | --- | --- | --- |
| Nguyễn Đức Khang (Leader) | `feature/dashboard` | Dashboard, điều hướng, review và tích hợp PR | `index.html`, `css/dashboard.css`, `js/dashboard.js` |
| Nguyễn Việt Hoàng | `feature/tasks` | Bài tập, deadline, tìm kiếm/lọc | `pages/tasks.html`, `css/tasks.css`, `js/tasks.js` |
| Nguyễn Văn Hào | `feature/calendar` | Lịch tháng, sự kiện, deadline từ Tasks | `pages/calendar.html`, `css/calendar.css`, `js/calendar.js` |
| Đào Bá Đạt | `feature/pomodoro` | Đồng hồ tập trung, phiên học, cài đặt giao diện | `pages/pomodoro.html`, `css/pomodoro.css`, `js/pomodoro.js` |
| Vũ Trường Giang | `feature/analytics` | Thống kê bài tập, thời gian học, mục tiêu | `pages/analytics.html`, `css/analytics.css`, `js/analytics.js` |

Đọc [yêu cầu](docs/requirements.md), [quy ước dữ liệu](docs/data-contract.md) và [cách cộng tác](docs/contribution.md) trước khi làm. Leader quản lý cấu trúc HTML chung, `css/global.css`, `js/common.js` và `js/storage.js`; khi cần thay đổi, trao đổi trong PR. `common.js` tự đánh dấu mục điều hướng của trang hiện tại.
