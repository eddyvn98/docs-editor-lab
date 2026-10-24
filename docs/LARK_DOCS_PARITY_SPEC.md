# LARK DOCS PARITY SPECIFICATION & ACCEPTANCE CHECKLIST
Document Editor Lab — Comprehensive Parity Standard against Lark Docs (Web Canvas)

---

## I. TỔNG QUAN YÊU CẦU PARITY (LARK DOCS CANONICAL PARITY)

Mục tiêu: Đưa ứng dụng `docs-editor-lab` đạt độ hoàn thiện tương đương 100% với Lark Docs thật trên trình duyệt (đối chiếu trực tiếp với tài liệu `QA - Docs parity checklist` tại Lark Suite). Toàn bộ tính năng, khối nội dung (block types), thao tác phím/chuột, menu nổi và giao diện phải hoạt động mượt mà trong 1 tài liệu duy nhất, không phụ thuộc server ngoài.

---

## II. TOÀN BỘ 21 LOẠI BLOCK NỘI DUNG (BLOCK CATALOG) CẦN CÓ TRONG 1 TÀI LIỆU

Một tài liệu mẫu hoàn chỉnh (Master Demo Document) phải khởi tạo và hỗ trợ đầy đủ 21 loại block sau:

### 1. Typography & Cấu trúc phân cấp
* **B1. Headings (H1 đến H9)**:
  - Hỗ trợ đầy đủ từ H1 đến H9 với kích thước font, line-height và weight phân cấp rõ ràng theo chuẩn Lark Docs.
  - Tích hợp chevron thu gọn/mở rộng (Section Folding) ở đầu mỗi heading.
  - Tự động đồng bộ phân cấp vào bảng mục lục (Outline Drawer bên trái).
* **B2. Paragraph / Đoạn văn bản giàu định dạng (`p`)**:
  - Hỗ trợ đầy đủ inline marks: Bold (`**`), Italic (`*`), Underline (`_`), Strikethrough (`~`), Inline Code (`` `code` ``), Text Color, Background Highlight, Link (`Ctrl+K`), Inline Math (`$E=mc^2$`), Comment Mark, Suggestion Mark.
* **B3. Danh sách dấu đầu dòng (Bulleted List - `bulletList`)**:
  - Dấu chấm tròn/vuông chuẩn Lark, thụt lề đa cấp bằng `Tab` và `Shift+Tab`.
* **B4. Danh sách đánh số (Numbered List - `orderedList`)**:
  - Tự động tăng số thứ tự (`1.`, `2.`, `3.`), phân cấp con khi thụt lề.
* **B5. Danh sách tác vụ (Task List / Checklist - `taskList`)**:
  - Checkbox tương tác `[ ]` / `[x]`, khi tick hoàn thành thì gạch ngang chữ (strikethrough) và làm mờ nhẹ text.
* **B6. Danh sách thu gọn (Toggle Block - `toggleBlock`)**:
  - Khối có icon mũi tên tam giác xoay được, click để ẩn/hiện toàn bộ các block lồng bên trong.
* **B7. Hộp ghi chú / Chú thích (Callout Box - `callout`)**:
  - Hộp bo góc có icon/emoji ở góc trái, hỗ trợ đổi màu nền (Xám, Xanh dương, Xanh lá, Vàng, Đỏ, Tím).
* **B8. Trích dẫn khối (Blockquote - `blockquote`)**:
  - Đường viền dọc bên trái (accent border), thụt lề nội dung, định dạng trích dẫn.
* **B9. Đường phân cách ngang (Divider - `hr`)**:
  - Thước kẻ ngang mảnh phân tách các phần nội dung.

### 2. Dữ liệu, Đồ họa & Phương tiện (Data, Graphics & Media)
* **B10. Khối mã nguồn (Code Block - `codeBlock`)**:
  - Hỗ trợ Syntax Highlighting (TypeScript, JS, Python, SQL, HTML, JSON, CSS, Markdown, Shell).
  - Thanh header gồm dropdown chọn ngôn ngữ, số dòng và nút "Copy code".
* **B11. Bảng dữ liệu chuẩn (Grid Table - `table`)**:
  - Bảng rich text với hàng tiêu đề (Header row), resize độ rộng cột bằng kéo thả viền cột, context menu thao tác ô: thêm/xóa dòng trên/dưới, thêm/xóa cột trái/phải, tô màu nền ô.
* **B12. Bảng tính nhúng (Inline Sheet - `inlineSheet`)**:
  - Bảng tính 3 cột x 2 hàng (hoặc tùy biến), nhập liệu trực tiếp trong từng cell, hỗ trợ tính năng Find/Replace nội dung trong ô bảng tính.
* **B13. Ảnh & Công cụ chỉnh sửa ảnh (Image, Crop & Lightbox - `image`)**:
  - Tải ảnh cục bộ hoặc dán ảnh từ clipboard.
  - Handle kéo cạnh ảnh để resize kích thước linh hoạt theo tỷ lệ %.
  - Chú thích ảnh (Caption) có thể click sửa trực tiếp dưới ảnh.
  - Cắt ảnh không phá hủy (In-place Non-destructive Crop): di chuyển khung crop, zoom, chỉnh insets, nút reset crop.
  - Lightbox modal: click vào ảnh phóng to toàn màn hình với zoom và pan.
* **B14. Bộ sưu tập ảnh (Image Gallery - `imageGallery`)**:
  - Lưới ảnh 2 đến 6 ảnh xếp dạng masonry / grid đồng bộ.
* **B15. Công thức toán học (Math Equation - `equation` & `inlineEquation`)**:
  - Hiển thị công thức TeX dưới dạng MathML/KaTeX (`\sum`, `\frac`, `\sqrt`).
  - Popover soạn thảo công thức toán có live preview trực quan.
* **B16. Sơ đồ Mermaid (Mermaid Diagram - `docsMermaid`)**:
  - Khối vẽ sơ đồ Flowchart, Sequence, Gantt, Mindmap từ cú pháp Mermaid văn bản với live SVG rendering.
* **B17. Khối Lộ trình / Dòng thời gian (Timeline Block - `docsTimeline`)**:
  - Biểu đồ tiến độ / roadmap theo các quý (Q1, Q2, Q3, Q4) hoặc giai đoạn (Phase 1, 2, 3).
* **B18. Bố cục nhiều cột (Columns Layout - `columns`)**:
  - Chia 2 cột, 3 cột, 4 cột song song. Kéo thanh chia giữa các cột để thay đổi độ rộng mượt mà.
* **B19. Tệp đính kèm & Đa phương tiện (Media Block - `mediaBlock`)**:
  - Card hiển thị tài liệu đính kèm (PDF, DOCX, Audio MP3, Video MP4) với icon loại file, dung lượng và nút tải về/mở file.
* **B20. Khối đồng bộ (Synced Block - `syncedBlock`)**:
  - Khối có badge "Đồng bộ", nội dung sửa ở bản sao này sẽ tự động cập nhật ngay trên tất cả các khối liên kết trong cùng tài liệu.
* **B21. Khối Mục lục tự động (Table of Contents - `docsToc`)**:
  - Khối nhúng mục lục ngay trong thân bài viết, tự động liệt kê các heading và click để nhảy đến vị trí.

---

## III. GIAO DIỆN KHUNG TÀI LIỆU & THAO TÁC (UI / UX SURFACE)

1. **Khung canvas trắng tối giản**: Document shell nền trắng viền trang sạch sẽ, toggle chế độ toàn màn hình hoặc độ rộng chuẩn (Standard Width vs Full Width).
2. **Document Hero**:
   - Thêm ảnh bìa (Cover Image) với các mẫu preset và upload tùy chọn, kéo điều chỉnh vị trí ảnh bìa (Reposition).
   - Thêm biểu tượng (Emoji / Icon) hiển thị nổi bật phía trên tiêu đề.
   - Tiêu đề tài liệu tự co giãn dòng theo nội dung, placeholder trực quan.
   - Metadata tác giả, thời gian sửa đổi lần cuối, số từ, thời gian đọc ước tính.
3. **Cây mục lục bên trái (Outline Drawer)**: Tự động gom các thẻ H1–H9, thụt lề phân cấp, đánh dấu heading đang đọc khi cuộn trang, click để cuộn mượt tới vị trí.
4. **Bảng đánh giá bên phải (Review & Comments Panel)**:
   - Tab "Bình luận": Ghim thread bình luận trên đoạn text hoặc trên tọa độ vùng ảnh (Image-region comments).
   - Tab "Đề xuất": Xem danh sách các sửa đổi đề xuất (thêm/xóa text) kèm nút Đồng ý (Accept) / Từ chối (Reject).
5. **Bộ chuyển đổi chế độ làm việc (Mode Switcher)**:
   - "Chỉnh sửa (Editing)"
   - "Đề xuất (Suggesting)"
   - "Chỉ xem (Reading)"
6. **Thanh tìm kiếm & Thay thế (Find & Replace)**:
   - Không phân biệt hoa thường, tìm từ nguyên vẹn, đếm số kết quả, highlight kết quả trong trang, cuộn đến kết quả kế tiếp.
7. **Lịch sử phiên bản cục bộ (Checkpoints)**:
   - Nút "Lưu phiên bản" và phục hồi lại checkpoint trước đó mà không mất dữ liệu.

---

## IV. TRẢI NGHIỆM THAO TÁC CHUẨN LARK (INTERACTION SUITE)

1. **Menu lệnh gạch chéo (Slash Menu `/`)**:
   - Gõ `/` hoặc `/mẫu` ở dòng trống hoặc giữa dòng để mở menu chèn nhanh. Đầy đủ các danh mục: Khối cơ bản, Phương tiện, Bảng & Dữ liệu, Mẫu tài liệu. Phím mũi tên lên/xuống và Enter để chọn.
2. **Grip tay cầm khối (Block Grip & Gutter)**:
   - Di chuột vào lề trái block hiện icon `+` (thêm block dưới) và icon `⠿` (kéo thả đổi vị trí hoặc click mở menu: Nhân bản, Xóa, Đổi màu, Chuyển đổi loại).
3. **Thanh công cụ chọn văn bản nổi (Floating Selection Toolbar)**:
   - Bôi đen đoạn text hiện thanh công cụ: Đậm, Nghiêng, Gạch chân, Gạch ngang, Code, Đổi màu chữ, Màu highlight, Link, Bình luận.
4. **Chọn nhiều khối cùng lúc (Multi-block Marquee Selection)**:
   - Kéo chuột chọn nhiều khối hoặc Shift+Click liên tiếp để chọn dải khối. Thanh tác vụ hàng loạt (Batch Bar) hiện bên dưới: Sao chép, Nhân bản, Xóa toàn bộ khối đã chọn, Gộp thành cột.

---

## V. CÁC QUY CHUẨN KỸ THUẬT & CRITICAL FIX BẮT BUỘC

1. **Không lỗi TypeScript**: Chạy `./node_modules/.bin/tsc -b` đạt 0 lỗi (PASS).
   - Kiểm tra kỹ `current` không null trong `ImageGallery.tsx`.
   - Ép kiểu UUID template literal an toàn trong `reviewTransactions.ts`.
   - Đối số truyền vào `documentMatches` trong `SearchHighlights.ts` phải đúng `SearchOptions`.
2. **Khắc phục triệt để 2 lỗi runtime ProseMirror**:
   - Tất cả các extension tạo `new Plugin()` phải có thuộc tính `key: new PluginKey('uniqueKeyName')` tường minh. Tuyệt đối không để key mặc định trùng nhau gây lỗi `RangeError: Adding different instances of a keyed plugin (plugin$)`.
   - Thuộc tính `decorations` trong `SearchHighlights.ts` phải trả về `DecorationSet.empty` hoặc `undefined`, **tuyệt đối không được trả về `null`** gây lỗi crash `Cannot read properties of undefined (reading 'localsInner')`.
3. **Giới hạn số dòng file**: Không có file nào vượt quá 300 dòng theo bài kiểm tra `node tests/check-lines.mjs`.
4. **Pass 100% test suite**: `node --experimental-strip-types --test tests/*.test.mjs` đạt 155/155 test PASS (bao gồm khôi phục `sheet` trong danh mục slash menu).
5. **Kiểm thử trình duyệt thật (Playwright)**: Cả `tests/browser.mjs` và `tests/docs-parity-browser.mjs` chạy thành công không có lỗi console ở cả 2 kích thước màn hình 1365px (Desktop) và 390px (Mobile 390px).
