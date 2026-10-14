# StudyFlow

Khung website quản lý học tập cho nhóm 5 người. Dùng HTML, CSS và JavaScript thuần; mỗi người phát triển một trang trên branch riêng. Các tính năng hiện là chỗ trống để nhóm triển khai.

## Chạy thử

Mở `index.html` trong trình duyệt. Các liên kết dùng đường dẫn tương đối, phù hợp cả khi triển khai trên GitHub Pages.

## Phân công

| Người | Branch | Chức năng | File được sửa |
| --- | --- | --- | --- |
| 1 – Leader | `feature/dashboard` | Dashboard, điều hướng, review và tích hợp PR | `index.html`, `css/dashboard.css`, `js/dashboard.js` |
| 2 | `feature/tasks` | Bài tập, deadline, tìm kiếm/lọc | `pages/tasks.html`, `css/tasks.css`, `js/tasks.js` |
| 3 | `feature/calendar` | Lịch tháng, sự kiện, deadline từ Tasks | `pages/calendar.html`, `css/calendar.css`, `js/calendar.js` |
| 4 | `feature/pomodoro` | Đồng hồ tập trung, phiên học, cài đặt giao diện | `pages/pomodoro.html`, `css/pomodoro.css`, `js/pomodoro.js` |
| 5 | `feature/analytics` | Thống kê bài tập, thời gian học, mục tiêu | `pages/analytics.html`, `css/analytics.css`, `js/analytics.js` |

Đọc [yêu cầu](docs/requirements.md), [quy ước dữ liệu](docs/data-contract.md) và [cách cộng tác](docs/contribution.md) trước khi làm. File dùng chung `css/global.css` và `js/storage.js` do leader quản lý; khi cần thay đổi, trao đổi trong PR.
