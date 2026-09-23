# WWM Codes

Trang tra cứu gift code **Where Winds Meet** còn hạn, kèm overlay copy lần lượt từng code
và tự lưu tiến trình.

👉 **https://huytran19.github.io/wwm-codes/**

📖 **Hướng dẫn dùng app:** https://huytran19.github.io/wwm-codes/huong-dan.html
🎬 **Video 1 phút:** https://huytran19.github.io/wwm-codes/huong-dan.html#video

## Có gì

- Danh sách code còn hạn, tìm kiếm và lọc theo *chưa dùng / đã dùng*
- **Tạo overlay** với 2 lựa chọn: nạp toàn bộ code còn hạn, hoặc ô trống để tự nhập
- Overlay copy từng code theo thứ tự — bấm `Space` là copy và nhảy sang code kế tiếp
- Tiến trình lưu ở `localStorage`, tải lại trang vẫn còn. Không có backend, không gửi gì đi đâu
- Mục tải app overlay cho Windows (ghi & chạy lại thao tác, phím tắt toàn cục, xuyên chuột)

## Phím tắt trong overlay

| Phím | Tác dụng |
|---|---|
| `Space` hoặc `Enter` | Copy code đang sáng, tự sang code kế tiếp |
| `Ctrl/Cmd + Z` | Hoàn tác lần copy gần nhất |
| `Esc` | Đóng overlay |

## Cấu trúc

```
index.html          Bố cục trang + overlay + các hộp thoại
huong-dan.html      Hướng dẫn từng bước cho người không rành máy tính
css/style.css       Giao diện
img/                Ảnh chụp app đã chú thích mũi tên + chữ
video/              Video hướng dẫn quay từ app thật, có phụ đề
js/codes-data.js    Danh sách code (bản chụp)
js/app.js           Logic danh sách, overlay, lưu tiến trình
```

## Cập nhật danh sách code

Code nằm trong `js/codes-data.js`. Nguồn gốc là danh sách cộng đồng ở
[codes.yar.gg](https://codes.yar.gg/) — trang đó dựng bằng JS nên muốn lấy mới thì mở trang,
chạy đoạn này trong Console rồi dán kết quả vào `js/codes-data.js`:

```js
[...document.querySelectorAll('article[data-code]')].map(a => ({
  code: a.dataset.code,
  date: a.querySelector('.code-date')?.textContent.trim() || ''
}))
```

## Ghi chú

Code do cộng đồng tổng hợp và có thể hết hạn bất cứ lúc nào. Trang này chỉ giúp copy cho
đỡ lạc chỗ, không liên quan tới nhà phát hành game.
