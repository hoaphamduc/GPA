<div align="center">

<img src="assets/logo/logo.png" alt="GPA Calculator" width="110" />

# Công Cụ Tính GPA Online (HNUE)

Tính điểm trung bình học tập **hệ 10**, quy đổi **hệ 4** và xếp loại học lực — nhanh, chính xác, miễn phí.

🔗 **Dùng thử:** [hnuegpacalculator.netlify.app](https://hnuegpacalculator.netlify.app)

</div>

---

## Giới thiệu

Đây là công cụ web giúp sinh viên (đặc biệt là sinh viên **Trường Đại học Sư phạm Hà Nội – HNUE**) tính GPA một cách trực quan: nhập điểm thành phần từng môn, hệ thống tự tính điểm hệ 10, quy đổi sang điểm chữ và hệ 4, xếp loại học lực, đồng thời vẽ biểu đồ và dự đoán điểm cần đạt.

Toàn bộ chạy **hoàn toàn ở trình duyệt** — không cần đăng nhập, không gửi dữ liệu đi đâu. Dữ liệu được lưu cục bộ trong `localStorage` của bạn.

## Tính năng

- 📝 **Quản lý môn học** — thêm / sửa / xóa môn với điểm chuyên cần, giữa kì, cuối kì.
- 📚 **Quản lý học kỳ** — thêm / xóa học kỳ, gom môn theo từng kỳ, chọn kỳ bằng dropdown.
- 🎯 **Tính toán tự động** — điểm hệ 10, điểm chữ, hệ 4, GPA từng kỳ, GPA tích lũy và xếp loại học lực.
- 📊 **Phân tích trực quan** — biểu đồ xu hướng GPA qua các kỳ và biểu đồ phân bố điểm chữ (SVG tự vẽ, không cần thư viện).
- 🔮 **Công cụ dự đoán**
  - Cần tối thiểu bao nhiêu điểm cuối kì để đạt từng mức điểm chữ.
  - Mục tiêu GPA toàn khóa: cần đạt trung bình bao nhiêu ở số tín chỉ còn lại.
- 💾 **Lưu trữ & chia sẻ** — tự động lưu cục bộ, sao lưu/khôi phục file JSON, chia sẻ bảng điểm qua link.
- 🖨️ **Xuất kết quả** — in / lưu PDF và xuất ảnh PNG bảng điểm.
- 📱 **Responsive** — dùng tốt trên cả điện thoại và máy tính.

## Cách tính điểm

**Điểm hệ 10** của mỗi môn theo quy chế tín chỉ:

```
Hệ 10 = Chuyên cần × 10%  +  Giữa kì × 30%  +  Cuối kì × 60%
```

**Quy đổi điểm chữ và hệ 4:**

| Hệ 10 | Điểm chữ | Hệ 4 |
|:-----:|:--------:|:----:|
| ≥ 8.5 | A  | 4.0 |
| ≥ 7.8 | B+ | 3.5 |
| ≥ 7.0 | B  | 3.0 |
| ≥ 6.3 | C+ | 2.5 |
| ≥ 5.5 | C  | 2.0 |
| ≥ 4.8 | D+ | 1.5 |
| ≥ 4.0 | D  | 1.0 |
| < 4.0 | F  | 0.0 |

**Xếp loại học lực** (theo GPA hệ 4): Xuất sắc (≥ 3.6) · Giỏi (≥ 3.2) · Khá (≥ 2.5) · Trung bình (≥ 2.0) · Yếu (< 2.0).

> GPA được tính theo trung bình **có trọng số theo số tín chỉ** của từng môn.

## Công nghệ

Không framework, không build step — chỉ HTML, CSS và JavaScript thuần (vanilla):

- **HTML5 / CSS3** — giao diện kiểu "bảng điểm giấy" với font *Fraunces* & *Be Vietnam Pro*.
- **JavaScript (ES6+)** — toàn bộ logic tính toán, biểu đồ SVG, lưu trữ.
- **[html2canvas](https://html2canvas.hertzen.com/)** — nạp động từ CDN chỉ khi xuất ảnh.
- Triển khai trên **Netlify**.

## Cấu trúc dự án

```
GPA/
├── index.html            # Cấu trúc trang
├── assets/
│   ├── css/
│   │   └── style.css     # Toàn bộ giao diện
│   ├── js/
│   │   ├── app.js        # Logic chính (tính toán, biểu đồ, lưu trữ)
│   │   └── popup.js       # Popup giới thiệu Mèo Béo Studio
│   └── logo/             # Hình ảnh / logo
└── README.md
```

## Chạy ở máy

Vì là trang tĩnh thuần, bạn chỉ cần:

```bash
git clone https://github.com/hoaphamduc/GPA.git
cd GPA
```

Rồi mở `index.html` bằng trình duyệt. Hoặc chạy một server tĩnh để tránh hạn chế của giao thức `file://`:

```bash
# Python
python3 -m http.server 8000

# hoặc Node
npx serve .
```

Truy cập `http://localhost:8000`.

## Đóng góp

Dự án là **mã nguồn mở** và rất hoan nghênh mọi đóng góp! 🎉

- 🐞 Tìm thấy lỗi hay tính sai? Hãy [mở một issue](https://github.com/hoaphamduc/GPA/issues).
- 💡 Có ý tưởng tính năng mới? Cứ thoải mái đề xuất.
- 🔧 Muốn sửa code? Fork dự án, tạo branch, rồi gửi Pull Request.

Các bước cơ bản:

```bash
# 1. Fork & clone
git clone https://github.com/<tài-khoản-của-bạn>/GPA.git
# 2. Tạo branch
git checkout -b feature/ten-tinh-nang
# 3. Commit & push
git commit -m "Thêm: mô tả thay đổi"
git push origin feature/ten-tinh-nang
# 4. Mở Pull Request trên GitHub
```

Nếu thấy dự án hữu ích, đừng quên tặng một ⭐ trên [GitHub](https://github.com/hoaphamduc/GPA) nhé!

## Tác giả

Được phát triển miễn phí cho sinh viên HNUE, code vui vẻ bởi [**Mèo Béo**](https://meobeo.netlify.app/).
