# Cách làm việc nhóm

1. Clone repo và tạo branch đúng tên trong README từ `main`: `git switch -c feature/tasks` (thay `tasks` bằng module của bạn).
2. Chỉ sửa HTML/CSS/JS của module được giao. Đọc quy ước dữ liệu trước khi lưu/đọc dữ liệu chung.
3. Commit, push branch: `git push -u origin feature/tasks`.
4. Tạo Pull Request vào `main`; mô tả chức năng, cách kiểm tra và ảnh giao diện nếu có.
5. Leader review rồi merge. Trước khi làm tiếp, cập nhật branch từ `main`.

Không push trực tiếp vào `main`. Nếu cần chỉnh file chung, nêu rõ trong PR để leader phối hợp. Mỗi PR nên nhỏ và chạy được khi mở trang tương ứng.
