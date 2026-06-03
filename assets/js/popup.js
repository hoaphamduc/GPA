function mbClosePopup() {
  var o = document.getElementById("mb-popup-overlay");
  if (o) o.classList.remove("mb-show");
}
(function () {
  // Hiện lại mỗi khi trang được tải/làm mới (không lưu trạng thái đã xem)
  setTimeout(function () {
    var o = document.getElementById("mb-popup-overlay");
    if (o) o.classList.add("mb-show");
  }, 2000);
  document.addEventListener("click", function (e) {
    if (e.target.id === "mb-popup-overlay") mbClosePopup();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") mbClosePopup();
  });
})();
