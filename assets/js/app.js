document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const addSubjectBtn = document.getElementById("addSubjectBtn");
  const addSemesterBtn = document.getElementById("addSemesterBtn");
  const subjectModal = document.getElementById("subjectModal");
  const modalCloseButton = document.getElementById("modalCloseButton");
  const cancelModalBtn = document.getElementById("cancelModalBtn");
  const modalTitle = document.getElementById("modalTitle");
  const subjectForm = document.getElementById("subjectForm");
  const subjectIdInput = document.getElementById("subjectId");
  const subjectNameInput = document.getElementById("subjectName");
  const semesterSelect = document.getElementById("semesterSelect");
  const newSemesterInput = document.getElementById("newSemesterInput");
  const NEW_SEM = "__new__";
  const creditsInput = document.getElementById("credits");
  const attendanceScoreInput = document.getElementById("attendanceScore");
  const midtermScoreInput = document.getElementById("midtermScore");
  const finalScoreInput = document.getElementById("finalScore");
  const subjectsTableBody = document.getElementById("subjectsTableBody");
  const subjectCountEl = document.getElementById("subjectCount");
  const totalCreditsSpan = document.getElementById("totalCredits");
  const gpa10Span = document.getElementById("gpa10");
  const gpa4Span = document.getElementById("gpa4");
  const academicStandingSpan = document.getElementById("academicStanding");
  const gpaGauge = document.getElementById("gpaGauge");

  // feature elements
  const predictSubject = document.getElementById("predictSubject");
  const predictAtt = document.getElementById("predictAtt");
  const predictMid = document.getElementById("predictMid");
  const finalPredictResult = document.getElementById("finalPredictResult");
  const targetGpaInput = document.getElementById("targetGpa");
  const totalProgramCreditsInput = document.getElementById("totalProgramCredits");
  const targetGpaResult = document.getElementById("targetGpaResult");
  const semesterCards = document.getElementById("semesterCards");
  const gpaTrendChart = document.getElementById("gpaTrendChart");
  const gradeDistChart = document.getElementById("gradeDistChart");
  const restoreInput = document.getElementById("restoreInput");
  const toastEl = document.getElementById("toast");

  const GAUGE_R = 100;
  const GAUGE_C = 2 * Math.PI * GAUGE_R;
  gpaGauge.style.strokeDasharray = GAUGE_C;
  gpaGauge.style.strokeDashoffset = GAUGE_C;

  let subjects = [];
  let extraSemesters = []; // học kỳ được tạo thủ công, có thể chưa có môn nào
  let editingSubjectId = null;
  let lastStats = null;

  const LETTERS = ["A", "B+", "B", "C+", "C", "D+", "D", "F"];

  // --- Helpers ---
  function clamp10(v) {
    const n = parseFloat(v);
    if (isNaN(n)) return 0;
    return Math.min(10, Math.max(0, n));
  }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }
  function normalizeSubject(s) {
    const sem = parseInt(s.semester);
    return {
      id: s.id != null ? s.id : Date.now() + Math.floor(Math.random() * 100000),
      name: (s.name != null ? String(s.name) : "Môn học").trim() || "Môn học",
      semester: Number.isFinite(sem) && sem > 0 ? sem : 1,
      credits: parseInt(s.credits) > 0 ? parseInt(s.credits) : 1,
      attendanceScore: clamp10(s.attendanceScore),
      midtermScore: clamp10(s.midtermScore),
      finalScore: clamp10(s.finalScore),
    };
  }
  function defaultSemester() {
    const nums = [
      ...subjects.map((s) => s.semester || 1),
      ...extraSemesters,
    ];
    return nums.length ? Math.max(...nums) : 1;
  }

  // tất cả học kỳ đang tồn tại (từ môn học + học kỳ trống), đã sắp xếp
  function allSemesterNumbers() {
    return [
      ...new Set([...subjects.map((s) => s.semester), ...extraSemesters]),
    ]
      .filter((n) => Number.isInteger(n) && n > 0)
      .sort((a, b) => a - b);
  }

  // số học kỳ mới nhỏ nhất còn trống
  function nextSemesterNumber() {
    const used = new Set(allSemesterNumbers());
    let next = 1;
    while (used.has(next)) next++;
    return next;
  }

  // --- LocalStorage Functions ---
  function loadSubjectsFromLocalStorage() {
    const storedSubjects = localStorage.getItem("gpaSubjects");
    if (storedSubjects) {
      try {
        subjects = JSON.parse(storedSubjects) || [];
      } catch (e) {
        subjects = [];
      }
    }
    // migrate older records (no semester field, out-of-range scores)
    subjects = subjects.map(normalizeSubject);
  }

  function saveSubjectsToLocalStorage() {
    localStorage.setItem("gpaSubjects", JSON.stringify(subjects));
  }

  function loadExtraSemesters() {
    try {
      const raw = JSON.parse(localStorage.getItem("gpaExtraSemesters"));
      extraSemesters = Array.isArray(raw)
        ? [
            ...new Set(
              raw
                .map((n) => parseInt(n))
                .filter((n) => Number.isInteger(n) && n > 0)
            ),
          ]
        : [];
    } catch (e) {
      extraSemesters = [];
    }
  }

  function saveExtraSemesters() {
    localStorage.setItem(
      "gpaExtraSemesters",
      JSON.stringify(extraSemesters)
    );
  }

  // --- Calculation Functions ---
  function calculateSubjectScore10(attendance, midterm, final) {
    const score =
      parseFloat(attendance) * 0.1 +
      parseFloat(midterm) * 0.3 +
      parseFloat(final) * 0.6;
    return Math.round(score * 10) / 10; // Round to 1 decimal place
  }

  function convertScore10ToLetter(score10) {
    if (score10 >= 8.5) return "A";
    if (score10 >= 7.8) return "B+";
    if (score10 >= 7.0) return "B";
    if (score10 >= 6.3) return "C+";
    if (score10 >= 5.5) return "C";
    if (score10 >= 4.8) return "D+";
    if (score10 >= 4.0) return "D";
    return "F";
  }

  function gradeClass(letter) {
    const base = letter.charAt(0).toLowerCase();
    return "grade-" + (["a", "b", "c", "d", "f"].includes(base) ? base : "f");
  }

  function convertLetterToScore4(letterScore) {
    switch (letterScore) {
      case "A": return 4.0;
      case "B+": return 3.5;
      case "B": return 3.0;
      case "C+": return 2.5;
      case "C": return 2.0;
      case "D+": return 1.5;
      case "D": return 1.0;
      case "F": return 0.0;
      default: return 0.0;
    }
  }

  // Compute everything in one pass: per-semester + overall + grade counts.
  function computeStats() {
    const bySem = new Map();
    const gradeCounts = {};
    LETTERS.forEach((l) => (gradeCounts[l] = 0));
    let totalCredits = 0,
      weightedSum10 = 0,
      weightedSum4 = 0;

    subjects.forEach((s) => {
      const credits = parseInt(s.credits) || 0;
      const score10 = calculateSubjectScore10(
        s.attendanceScore,
        s.midtermScore,
        s.finalScore
      );
      const letter = convertScore10ToLetter(score10);
      const score4 = convertLetterToScore4(letter);

      totalCredits += credits;
      weightedSum10 += score10 * credits;
      weightedSum4 += score4 * credits;
      gradeCounts[letter] = (gradeCounts[letter] || 0) + 1;

      if (!bySem.has(s.semester)) {
        bySem.set(s.semester, {
          sem: s.semester,
          credits: 0,
          ws10: 0,
          ws4: 0,
          subjects: [],
        });
      }
      const g = bySem.get(s.semester);
      g.credits += credits;
      g.ws10 += score10 * credits;
      g.ws4 += score4 * credits;
      g.subjects.push(s);
    });

    const sems = [...bySem.values()]
      .map((g) => ({
        sem: g.sem,
        credits: g.credits,
        subjects: g.subjects,
        gpa10: g.credits ? g.ws10 / g.credits : 0,
        gpa4: g.credits ? g.ws4 / g.credits : 0,
      }))
      .sort((a, b) => a.sem - b.sem);

    return {
      totalCredits,
      gradeCounts,
      gpa10: totalCredits ? weightedSum10 / totalCredits : 0,
      gpa4: totalCredits ? weightedSum4 / totalCredits : 0,
      sems,
    };
  }

  // animate a number from current displayed value to target
  function animateValue(el, to, decimals) {
    const from = parseFloat(el.textContent) || 0;
    const duration = 650;
    let startTs = null;
    function step(ts) {
      if (startTs === null) startTs = ts;
      const p = Math.min((ts - startTs) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = from + (to - from) * eased;
      el.textContent = decimals ? val.toFixed(decimals) : Math.round(val);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function updateGauge(gpa4) {
    const pct = Math.max(0, Math.min(gpa4 / 4, 1));
    gpaGauge.style.strokeDashoffset = GAUGE_C * (1 - pct);
  }

  // Single entry point: recompute stats and refresh every view.
  function refresh() {
    lastStats = computeStats();
    renderSubjectsTable();
    updateResults();
    renderSemesterCards();
    renderCharts();
    populateSubjectSelect();
    updateTargetGpa();
    updateCount();
  }

  function updateResults() {
    if (subjects.length === 0) {
      animateValue(totalCreditsSpan, 0, 0);
      animateValue(gpa10Span, 0, 2);
      animateValue(gpa4Span, 0, 2);
      academicStandingSpan.textContent = "—";
      updateGauge(0);
      return;
    }
    animateValue(totalCreditsSpan, lastStats.totalCredits, 0);
    animateValue(gpa10Span, lastStats.gpa10, 2);
    animateValue(gpa4Span, lastStats.gpa4, 2);
    academicStandingSpan.textContent = determineAcademicStanding(lastStats.gpa4);
    updateGauge(lastStats.gpa4);
  }

  function updateCount() {
    subjectCountEl.textContent = subjects.length
      ? subjects.length + " môn"
      : "";
  }

  // --- Semester cards ---
  function renderSemesterCards() {
    if (!lastStats || lastStats.sems.length === 0) {
      semesterCards.innerHTML =
        '<p class="chart-empty">Chưa có học kỳ nào — thêm môn để xem.</p>';
      return;
    }
    let html = lastStats.sems
      .map(
        (s) => `
        <div class="sem-card">
          <div class="lbl">Học kỳ ${s.sem}</div>
          <div class="big">${s.gpa4.toFixed(2)}</div>
          <div class="sub">${s.credits} tín chỉ · hệ 10: ${s.gpa10.toFixed(2)}</div>
        </div>`
      )
      .join("");
    html += `
        <div class="sem-card cumulative">
          <div class="lbl">Tích lũy</div>
          <div class="big">${lastStats.gpa4.toFixed(2)}</div>
          <div class="sub">${lastStats.totalCredits} tín chỉ · ${determineAcademicStanding(lastStats.gpa4)}</div>
        </div>`;
    semesterCards.innerHTML = html;
  }

  // --- Charts (hand-drawn SVG, no dependencies) ---
  function renderCharts() {
    renderGpaTrendChart();
    renderGradeDistChart();
  }

  function renderGpaTrendChart() {
    const sems = lastStats ? lastStats.sems : [];
    if (!sems.length) {
      gpaTrendChart.innerHTML =
        '<p class="chart-empty">Thêm môn để xem biểu đồ.</p>';
      return;
    }
    const W = 460, H = 240, L = 32, R = 14, T = 18, B = 30;
    const iw = W - L - R, ih = H - T - B, n = sems.length;
    const x = (i) => L + (n === 1 ? iw / 2 : (iw * i) / (n - 1));
    const y = (v) => T + ih * (1 - Math.max(0, Math.min(v, 4)) / 4);

    let grid = "";
    for (let g = 0; g <= 4; g++) {
      const gy = y(g);
      grid += `<line x1="${L}" y1="${gy.toFixed(1)}" x2="${W - R}" y2="${gy.toFixed(1)}" stroke="rgba(34,31,26,0.13)" stroke-width="1"/>`;
      grid += `<text x="${L - 8}" y="${(gy + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="#8a7f6e">${g}</text>`;
    }
    const pts = sems.map((s, i) => [x(i), y(s.gpa4)]);
    const line = pts
      .map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1))
      .join(" ");
    const area =
      `M${pts[0][0].toFixed(1)} ${(T + ih).toFixed(1)} ` +
      pts.map((p) => "L" + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ") +
      ` L${pts[n - 1][0].toFixed(1)} ${(T + ih).toFixed(1)} Z`;
    const marks = sems
      .map((s, i) => {
        const px = x(i), py = y(s.gpa4);
        return (
          `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4" fill="#b8341f" stroke="#fbf6ec" stroke-width="2"/>` +
          `<text x="${px.toFixed(1)}" y="${(py - 10).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#221f1a">${s.gpa4.toFixed(2)}</text>` +
          `<text x="${px.toFixed(1)}" y="${(T + ih + 18).toFixed(1)}" text-anchor="middle" font-size="10" fill="#5b5246">HK${s.sem}</text>`
        );
      })
      .join("");
    gpaTrendChart.innerHTML =
      `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Biểu đồ xu hướng GPA theo học kỳ">` +
      grid +
      `<path d="${area}" fill="rgba(184,52,31,0.08)"/>` +
      `<path d="${line}" fill="none" stroke="#b8341f" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` +
      marks +
      `</svg>`;
  }

  function renderGradeDistChart() {
    const counts = lastStats ? lastStats.gradeCounts : null;
    const total = counts
      ? LETTERS.reduce((a, l) => a + (counts[l] || 0), 0)
      : 0;
    if (!total) {
      gradeDistChart.innerHTML =
        '<p class="chart-empty">Thêm môn để xem biểu đồ.</p>';
      return;
    }
    const COLORS = {
      A: "#2c6b41",
      "B+": "#3a6ea5",
      B: "#284a78",
      "C+": "#a8801f",
      C: "#8f6618",
      "D+": "#c06a2a",
      D: "#a8501c",
      F: "#a32418",
    };
    const W = 460, H = 240, L = 26, R = 12, T = 18, B = 34;
    const iw = W - L - R, ih = H - T - B;
    const max = Math.max(...LETTERS.map((l) => counts[l] || 0), 1);
    const slot = iw / LETTERS.length;
    const bw = Math.min(40, slot * 0.62);
    let bars = "";
    LETTERS.forEach((l, i) => {
      const c = counts[l] || 0;
      const bh = c ? (ih * c) / max : 0;
      const bx = L + slot * i + (slot - bw) / 2;
      const by = T + ih - bh;
      bars += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${COLORS[l]}" opacity="${c ? 0.92 : 0.16}"/>`;
      if (c)
        bars += `<text x="${(bx + bw / 2).toFixed(1)}" y="${(by - 6).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#221f1a">${c}</text>`;
      bars += `<text x="${(bx + bw / 2).toFixed(1)}" y="${(T + ih + 18).toFixed(1)}" text-anchor="middle" font-size="11" font-family="Fraunces, serif" fill="#5b5246">${l}</text>`;
    });
    bars += `<line x1="${L}" y1="${(T + ih).toFixed(1)}" x2="${W - R}" y2="${(T + ih).toFixed(1)}" stroke="rgba(34,31,26,0.3)" stroke-width="1"/>`;
    gradeDistChart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Biểu đồ phân bố điểm chữ">${bars}</svg>`;
  }

  // --- Prediction: needed final-exam score ---
  const FINAL_THRESHOLDS = [
    { label: "A", t: 8.5 },
    { label: "B+", t: 7.8 },
    { label: "B", t: 7.0 },
    { label: "C+", t: 6.3 },
    { label: "C", t: 5.5 },
    { label: "D+", t: 4.8 },
    { label: "D · qua môn", t: 4.0 },
  ];
  function updateFinalPredict() {
    const att = parseFloat(predictAtt.value);
    const mid = parseFloat(predictMid.value);
    if (isNaN(att) || isNaN(mid)) {
      finalPredictResult.innerHTML =
        '<p class="desc" style="margin:0">Nhập điểm chuyên cần và giữa kì để xem kết quả.</p>';
      return;
    }
    const a = clamp10(att), m = clamp10(mid);
    const items = FINAL_THRESHOLDS.map((th) => {
      // Làm tròn 4 chữ số thập phân để khử sai số dấu phẩy động
      // (vd 0.3*9 = 2.6999… khiến 8.0 bị tính thành 8.0000000002 rồi lố lên 8.1)
      const need =
        Math.round(((th.t - 0.1 * a - 0.3 * m) / 0.6) * 1e4) / 1e4;
      let val, state;
      if (need <= 0) {
        val = "Đã chắc chắn đạt";
        state = "ok";
      } else if (need > 10) {
        val = "Không thể đạt";
        state = "no";
      } else {
        val = "≥ " + (Math.ceil(need * 10 - 1e-9) / 10).toFixed(1);
        state = "";
      }
      return `<li><span class="g">${th.label}</span><span class="need ${state}">${val}</span></li>`;
    }).join("");
    finalPredictResult.innerHTML = `<ul class="predict-list">${items}</ul>`;
  }

  // --- Prediction: target GPA ---
  function gpa4ToLetterApprox(g) {
    if (g >= 3.75) return "A";
    if (g >= 3.25) return "B+";
    if (g >= 2.75) return "B";
    if (g >= 2.25) return "C+";
    if (g >= 1.75) return "C";
    if (g >= 1.25) return "D+";
    if (g >= 0.5) return "D";
    return "F";
  }
  function updateTargetGpa() {
    const target = parseFloat(targetGpaInput.value);
    const totalProg = parseInt(totalProgramCreditsInput.value);
    const curCredits = lastStats ? lastStats.totalCredits : 0;
    const curGpa = lastStats ? lastStats.gpa4 : 0;

    const set = (cls, html) => {
      targetGpaResult.className = "tool-result target-out" + (cls ? " " + cls : "");
      targetGpaResult.innerHTML = html;
    };

    if (isNaN(target) || isNaN(totalProg)) {
      set("", '<p class="desc" style="margin:0">Nhập mục tiêu và tổng tín chỉ để xem kết quả.</p>');
      return;
    }
    if (target < 0 || target > 4) {
      set("bad", "<p>GPA mục tiêu phải nằm trong khoảng 0–4.</p>");
      return;
    }
    const remaining = totalProg - curCredits;
    if (remaining <= 0) {
      set(
        "",
        `<p>Bạn đã tích lũy ${curCredits} tín chỉ (≥ tổng đã nhập). GPA hiện tại: <span class="num">${curGpa.toFixed(2)}</span></p>`
      );
      return;
    }
    const need = (target * totalProg - curGpa * curCredits) / remaining;
    if (need > 4) {
      set(
        "bad",
        `<p>Ở ${remaining} tín chỉ còn lại cần trung bình <span class="num">${need.toFixed(2)}</span>/4.0 — <b>vượt quá 4.0, không khả thi</b>. Hãy đặt mục tiêu thấp hơn.</p>`
      );
      return;
    }
    if (need <= 0) {
      set(
        "",
        `<p>Bạn gần như đã đạt mục tiêu! Chỉ cần qua ${remaining} tín chỉ còn lại là đủ.</p>`
      );
      return;
    }
    set(
      "",
      `<p>Ở ${remaining} tín chỉ còn lại, bạn cần đạt trung bình <span class="num">${need.toFixed(2)}</span>/4.0 (≈ điểm ${gpa4ToLetterApprox(need)}) để đạt GPA ${target.toFixed(2)}.</p>`
    );
  }

  // --- Subject picker for the final-score predictor ---
  function populateSubjectSelect() {
    const prev = predictSubject.value;
    predictSubject.innerHTML =
      '<option value="">— Nhập tay —</option>' +
      subjects
        .map(
          (s) =>
            `<option value="${s.id}">${escapeHtml(s.name)} (HK${s.semester})</option>`
        )
        .join("");
    if ([...predictSubject.options].some((o) => o.value === prev)) {
      predictSubject.value = prev;
    }
  }

  // --- Toast ---
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
  }

  // --- Export / backup / share ---
  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function backupData() {
    if (!subjects.length) {
      toast("Chưa có dữ liệu để sao lưu.");
      return;
    }
    const data = JSON.stringify(
      {
        app: "gpa-calculator",
        version: 1,
        exportedAt: new Date().toISOString(),
        subjects,
      },
      null,
      2
    );
    downloadBlob(data, "bang-diem-gpa.json", "application/json");
    toast("Đã tải file sao lưu.");
  }

  function restoreData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const arr = Array.isArray(parsed) ? parsed : parsed.subjects;
        if (!Array.isArray(arr)) throw new Error("format");
        if (
          subjects.length &&
          !confirm("Khôi phục sẽ thay thế toàn bộ dữ liệu hiện tại. Tiếp tục?")
        )
          return;
        subjects = arr.map(normalizeSubject);
        saveSubjectsToLocalStorage();
        refresh();
        toast("Đã khôi phục " + subjects.length + " môn học.");
      } catch (e) {
        alert("File không hợp lệ. Vui lòng chọn file .json đã sao lưu từ công cụ này.");
      }
    };
    reader.readAsText(file);
  }

  let h2cLoading = null;
  function loadHtml2canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (h2cLoading) return h2cLoading;
    h2cLoading = new Promise((resolve, reject) => {
      const sc = document.createElement("script");
      sc.src =
        "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      sc.onload = () => resolve(window.html2canvas);
      sc.onerror = () => reject(new Error("load failed"));
      document.head.appendChild(sc);
    });
    return h2cLoading;
  }
  async function exportImage() {
    if (!subjects.length) {
      toast("Chưa có dữ liệu để xuất ảnh.");
      return;
    }
    toast("Đang tạo ảnh…");
    try {
      const h2c = await loadHtml2canvas();
      const node = document.querySelector(".sheet");
      const canvas = await h2c(node, {
        backgroundColor: "#f1e9da",
        scale: 2,
        useCORS: true,
      });
      canvas.toBlob((b) => {
        if (b) {
          downloadBlob(b, "bang-diem-gpa.png", "image/png");
          toast("Đã tải ảnh bảng điểm.");
        }
      });
    } catch (e) {
      alert(
        "Không tạo được ảnh (có thể do mất kết nối mạng). Hãy dùng 'Xuất PDF / In' rồi chọn Lưu thành PDF."
      );
    }
  }

  function encodeData(obj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  }
  function decodeData(str) {
    return JSON.parse(decodeURIComponent(escape(atob(str))));
  }
  function shareLink() {
    if (!subjects.length) {
      toast("Chưa có dữ liệu để chia sẻ.");
      return;
    }
    const slim = subjects.map((s) => ({
      n: s.name,
      se: s.semester,
      c: s.credits,
      a: s.attendanceScore,
      m: s.midtermScore,
      f: s.finalScore,
    }));
    const code = "#d=" + encodeData(slim);
    const url = location.origin + location.pathname + code;
    history.replaceState(null, "", code);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        () => toast("Đã sao chép link chia sẻ!"),
        () => prompt("Sao chép link chia sẻ:", url)
      );
    } else {
      prompt("Sao chép link chia sẻ:", url);
    }
  }
  function tryImportFromHash() {
    const m = location.hash.match(/[#&]d=([^&]+)/);
    if (!m) return;
    try {
      const slim = decodeData(m[1]);
      if (!Array.isArray(slim) || !slim.length) return;
      if (
        subjects.length &&
        !confirm("Mở dữ liệu từ link chia sẻ? Việc này sẽ thay thế dữ liệu hiện tại.")
      ) {
        history.replaceState(null, "", location.pathname);
        return;
      }
      subjects = slim.map((o) =>
        normalizeSubject({
          name: o.n,
          semester: o.se,
          credits: o.c,
          attendanceScore: o.a,
          midtermScore: o.m,
          finalScore: o.f,
        })
      );
      saveSubjectsToLocalStorage();
      toast("Đã nhập dữ liệu từ link chia sẻ.");
    } catch (e) {
      /* ignore malformed share link */
    }
    history.replaceState(null, "", location.pathname);
  }

  function determineAcademicStanding(gpa4) {
    if (gpa4 >= 3.6) return "Xuất sắc";
    if (gpa4 >= 3.2) return "Giỏi";
    if (gpa4 >= 2.5) return "Khá";
    if (gpa4 >= 2.0) return "Trung bình";
    return "Yếu";
  }

  // --- Rendering Functions ---
  function renderSubjectRow(subject) {
    const row = subjectsTableBody.insertRow();
    row.setAttribute("data-id", subject.id);

    row.insertCell().textContent = subject.name;
    row.insertCell().textContent = subject.credits;
    row.insertCell().textContent = subject.attendanceScore;
    row.insertCell().textContent = subject.midtermScore;
    row.insertCell().textContent = subject.finalScore;

    const score10 = calculateSubjectScore10(
      subject.attendanceScore,
      subject.midtermScore,
      subject.finalScore
    );
    const score10Cell = row.insertCell();
    score10Cell.textContent = score10.toFixed(1);
    score10Cell.classList.add("score10");

    const letter = convertScore10ToLetter(score10);
    const letterCell = row.insertCell();
    const chip = document.createElement("span");
    chip.className = "grade " + gradeClass(letter);
    chip.textContent = letter;
    letterCell.appendChild(chip);

    const actionsCell = row.insertCell();
    actionsCell.classList.add("actions");
    const editButton = document.createElement("button");
    editButton.textContent = "Sửa";
    editButton.classList.add("edit-btn");
    editButton.onclick = () => openEditModal(subject.id);
    actionsCell.appendChild(editButton);

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Xóa";
    deleteButton.classList.add("delete-btn");
    deleteButton.onclick = () => deleteSubject(subject.id);
    actionsCell.appendChild(deleteButton);
  }

  function renderSubjectsTable() {
    subjectsTableBody.innerHTML = "";

    const stats = lastStats || computeStats();
    const semStats = new Map(stats.sems.map((s) => [s.sem, s]));
    const allSems = [
      ...new Set([...semStats.keys(), ...extraSemesters]),
    ].sort((a, b) => a - b);

    if (allSems.length === 0) {
      const row = subjectsTableBody.insertRow();
      row.classList.add("empty-row");
      const cell = row.insertCell();
      cell.colSpan = 8;
      cell.textContent = "Trang còn để trống — thêm môn học đầu tiên của bạn.";
      return;
    }

    allSems.forEach((semNum) => {
      const sem = semStats.get(semNum);

      const headRow = subjectsTableBody.insertRow();
      headRow.className = "sem-head";
      const headCell = headRow.insertCell();
      headCell.colSpan = 8;
      const meta = sem
        ? `${sem.credits} tín chỉ · GPA hệ 4 <b>${sem.gpa4.toFixed(
            2
          )}</b> · hệ 10 <b>${sem.gpa10.toFixed(2)}</b>`
        : "Chưa có môn học";
      headCell.innerHTML =
        `<div class="sem-head-inner">` +
        `<span class="sem-name">Học kỳ ${semNum}</span>` +
        `<span class="sem-meta">${meta}</span>` +
        `</div>`;

      const actions = document.createElement("span");
      actions.className = "sem-actions";
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "sem-btn sem-add";
      addBtn.textContent = "+ Môn";
      addBtn.title = "Thêm môn học vào học kỳ này";
      addBtn.onclick = () => openAddModal(semNum);
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "sem-btn sem-del";
      delBtn.textContent = "Xóa kỳ";
      delBtn.title = "Xóa toàn bộ học kỳ này";
      delBtn.onclick = () => deleteSemester(semNum);
      actions.appendChild(addBtn);
      actions.appendChild(delBtn);
      headCell.querySelector(".sem-head-inner").appendChild(actions);

      if (sem) {
        sem.subjects.forEach(renderSubjectRow);
      } else {
        const emptyRow = subjectsTableBody.insertRow();
        const emptyCell = emptyRow.insertCell();
        emptyCell.colSpan = 8;
        emptyCell.className = "sem-empty";
        emptyCell.append("Chưa có môn học trong kỳ này — ");
        const inlineAdd = document.createElement("button");
        inlineAdd.type = "button";
        inlineAdd.className = "sem-empty-add";
        inlineAdd.textContent = "thêm môn học";
        inlineAdd.onclick = () => openAddModal(semNum);
        emptyCell.appendChild(inlineAdd);
      }
    });
  }

  // --- Semester picker inside the modal ---
  // Đổ danh sách học kỳ đã có vào dropdown + tùy chọn "Học kỳ mới…".
  function populateSemesterSelect(selected) {
    const sems = allSemesterNumbers();
    semesterSelect.innerHTML =
      sems
        .map((n) => `<option value="${n}">Học kỳ ${n}</option>`)
        .join("") +
      `<option value="${NEW_SEM}">➕ Học kỳ mới…</option>`;

    if (Number.isInteger(selected) && sems.includes(selected)) {
      semesterSelect.value = String(selected);
    } else if (sems.length) {
      semesterSelect.value = String(sems[sems.length - 1]);
    } else {
      semesterSelect.value = NEW_SEM;
    }
    syncNewSemesterField();
  }

  // Hiện/ẩn ô nhập số khi chọn "Học kỳ mới…".
  function syncNewSemesterField() {
    const isNew = semesterSelect.value === NEW_SEM;
    newSemesterInput.style.display = isNew ? "block" : "none";
    if (isNew) newSemesterInput.value = nextSemesterNumber();
  }

  // Học kỳ đang được chọn trong form (số nguyên, hoặc NaN nếu chưa hợp lệ).
  function getSelectedSemester() {
    return semesterSelect.value === NEW_SEM
      ? parseInt(newSemesterInput.value)
      : parseInt(semesterSelect.value);
  }

  // --- Modal Functions ---
  function openAddModal(presetSemester) {
    editingSubjectId = null;
    modalTitle.textContent = "Thêm Môn Học Mới";
    subjectForm.reset();
    subjectIdInput.value = "";
    populateSemesterSelect(
      Number.isInteger(presetSemester) && presetSemester > 0
        ? presetSemester
        : defaultSemester()
    );
    subjectModal.style.display = "block";
    subjectNameInput.focus();
  }

  function openEditModal(subjectId) {
    const subjectToEdit = subjects.find((s) => s.id === subjectId);
    if (!subjectToEdit) return;

    editingSubjectId = subjectId;
    modalTitle.textContent = "Sửa Thông Tin Môn Học";
    subjectIdInput.value = subjectToEdit.id;
    subjectNameInput.value = subjectToEdit.name;
    populateSemesterSelect(subjectToEdit.semester);
    creditsInput.value = subjectToEdit.credits;
    attendanceScoreInput.value = subjectToEdit.attendanceScore;
    midtermScoreInput.value = subjectToEdit.midtermScore;
    finalScoreInput.value = subjectToEdit.finalScore;
    subjectModal.style.display = "block";
    subjectNameInput.focus();
  }

  function closeModal() {
    subjectModal.style.display = "none";
    subjectForm.reset();
  }

  // --- Subject Management ---
  function handleSubjectFormSubmit(event) {
    event.preventDefault();

    const name = subjectNameInput.value.trim();
    const semester = getSelectedSemester();
    const credits = parseInt(creditsInput.value);
    const attendanceScore = parseFloat(attendanceScoreInput.value);
    const midtermScore = parseFloat(midtermScoreInput.value);
    const finalScore = parseFloat(finalScoreInput.value);

    if (!name) {
      alert("Vui lòng nhập tên môn học.");
      subjectNameInput.focus();
      return;
    }
    if (isNaN(semester) || semester <= 0) {
      alert("Học kỳ phải là một số nguyên dương.");
      (semesterSelect.value === NEW_SEM
        ? newSemesterInput
        : semesterSelect
      ).focus();
      return;
    }
    if (isNaN(credits) || credits <= 0) {
      alert("Số tín chỉ phải là một số nguyên dương.");
      creditsInput.focus();
      return;
    }
    if (isNaN(attendanceScore) || attendanceScore < 0 || attendanceScore > 10) {
      alert("Điểm chuyên cần phải là số từ 0 đến 10.");
      attendanceScoreInput.focus();
      return;
    }
    if (isNaN(midtermScore) || midtermScore < 0 || midtermScore > 10) {
      alert("Điểm giữa kì phải là số từ 0 đến 10.");
      midtermScoreInput.focus();
      return;
    }
    if (isNaN(finalScore) || finalScore < 0 || finalScore > 10) {
      alert("Điểm cuối kì phải là số từ 0 đến 10.");
      finalScoreInput.focus();
      return;
    }

    if (editingSubjectId) {
      const subjectIndex = subjects.findIndex((s) => s.id === editingSubjectId);
      if (subjectIndex > -1) {
        subjects[subjectIndex] = {
          id: editingSubjectId,
          name,
          semester,
          credits,
          attendanceScore,
          midtermScore,
          finalScore,
        };
      }
    } else {
      const newSubject = {
        id: Date.now(),
        name,
        semester,
        credits,
        attendanceScore,
        midtermScore,
        finalScore,
      };
      subjects.push(newSubject);
    }

    saveSubjectsToLocalStorage();
    // học kỳ nào đã có môn thì không cần lưu như học kỳ trống nữa
    if (extraSemesters.length) {
      const pruned = extraSemesters.filter(
        (n) => !subjects.some((s) => s.semester === n)
      );
      if (pruned.length !== extraSemesters.length) {
        extraSemesters = pruned;
        saveExtraSemesters();
      }
    }
    refresh();
    closeModal();
    editingSubjectId = null;
  }

  function deleteSubject(subjectId) {
    if (confirm("Bạn có chắc chắn muốn xóa môn học này?")) {
      subjects = subjects.filter((s) => s.id !== subjectId);
      saveSubjectsToLocalStorage();
      refresh();
    }
  }

  // --- Semester Management ---
  function addSemester() {
    const next = nextSemesterNumber(); // học kỳ trống nhỏ nhất còn thiếu
    extraSemesters.push(next);
    saveExtraSemesters();
    refresh();
    toast("Đã thêm học kỳ " + next + ".");
  }

  function deleteSemester(semNum) {
    const inSem = subjects.filter((s) => s.semester === semNum);
    const msg = inSem.length
      ? `Xóa học kỳ ${semNum} cùng toàn bộ ${inSem.length} môn học trong kỳ? Hành động này không thể hoàn tác.`
      : `Xóa học kỳ ${semNum}?`;
    if (!confirm(msg)) return;
    subjects = subjects.filter((s) => s.semester !== semNum);
    extraSemesters = extraSemesters.filter((n) => n !== semNum);
    saveSubjectsToLocalStorage();
    saveExtraSemesters();
    refresh();
    toast("Đã xóa học kỳ " + semNum + ".");
  }

  // --- Event Listeners ---
  addSubjectBtn.addEventListener("click", () => openAddModal());
  addSemesterBtn.addEventListener("click", addSemester);
  modalCloseButton.addEventListener("click", closeModal);
  cancelModalBtn.addEventListener("click", closeModal);
  semesterSelect.addEventListener("change", syncNewSemesterField);
  subjectForm.addEventListener("submit", handleSubjectFormSubmit);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && subjectModal.style.display === "block") closeModal();
  });
  window.addEventListener("click", (event) => {
    if (event.target == subjectModal) closeModal();
  });

  // Prediction tools
  predictAtt.addEventListener("input", updateFinalPredict);
  predictMid.addEventListener("input", updateFinalPredict);
  predictSubject.addEventListener("change", () => {
    const s = subjects.find((x) => String(x.id) === predictSubject.value);
    if (s) {
      predictAtt.value = s.attendanceScore;
      predictMid.value = s.midtermScore;
    }
    updateFinalPredict();
  });
  targetGpaInput.addEventListener("input", updateTargetGpa);
  totalProgramCreditsInput.addEventListener("input", updateTargetGpa);

  // Export / backup / share
  document.getElementById("exportPdfBtn").addEventListener("click", () => window.print());
  document.getElementById("exportImgBtn").addEventListener("click", exportImage);
  document.getElementById("backupBtn").addEventListener("click", backupData);
  document.getElementById("shareBtn").addEventListener("click", shareLink);
  document.getElementById("restoreBtn").addEventListener("click", () => restoreInput.click());
  restoreInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) restoreData(e.target.files[0]);
    e.target.value = "";
  });

  // --- Initial Load ---
  function initializeApp() {
    loadSubjectsFromLocalStorage();
    loadExtraSemesters();
    tryImportFromHash();
    refresh();
    updateFinalPredict();
  }

  initializeApp();
});
