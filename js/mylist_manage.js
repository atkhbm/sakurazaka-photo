import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import "../firebase.js";

const auth = window.firebaseAuth;

// ========== 状態 ==========
let allData = { "2nd": [], "3rd": [], "4th": [] }; // 各CSV => [member, item, pose]
let currentTab = "member";          // "member" | "want" | "provide" | "own"
let currentGen = "2nd";             // "2nd" | "3rd" | "4th"
let viewScope = "all";              // "all" | "gen" | "member"
let selectedMember = "";            // viewScope === 'member' のときのみ有効

const lists = { want: new Set(), provide: new Set(), own: new Set() };
const tempChecked = { want: new Set(), provide: new Set(), own: new Set() };

const enc = (s) => encodeURIComponent(s ?? "");
const dec = (s) => decodeURIComponent(s ?? "");

// ========== データ取得 ==========
async function loadCSV(gen, url) {
  const res = await fetch(url);
  const text = await res.text();
  const rows = text.trim().split("\n").slice(1).map(line =>
    line.match(/(".*?"|[^",]+)(?=,|$)/g).map(cell => cell.replace(/^"|"$/g, ""))
  );
  allData[gen] = rows;
}

function getCombinedRows() {
  return [...allData["2nd"], ...allData["3rd"], ...allData["4th"]];
}

function getMembersOf(gen) {
  const rows = gen ? allData[gen] : getCombinedRows();
  return [...new Set(rows.map(r => r[0]))];
}

// ========== Firestore ==========
async function loadLists(userId) {
  const data = await window.loadMyList(userId);
  lists.want = new Set(data.want || []);
  lists.provide = new Set(data.provide || []);
  lists.own = new Set(data.own || []);
  renderTable();
}

// ========== 初期化 ==========
Promise.all([
  loadCSV("2nd", "sakurazaka_2nd_gen.csv"),
  loadCSV("3rd", "sakurazaka_3rd_gen.csv"),
  loadCSV("4th", "sakurazaka_4th_gen.csv"),
]).then(() => {
  // 期タブを有効化
  const genTabs = document.getElementById("generation-tabs");
  if (genTabs) genTabs.style.display = "block";

  // 認証
  onAuthStateChanged(auth, (user) => {
    if (user) loadLists(user.uid);
    else location.href = "login.html";
  });

  // 初期表示：メンバー一覧タブ → 全メンバーのボタンを表示、表は全期まとめ
  currentTab = "member";
  viewScope = "all";
  selectedMember = "";
  renderAllMembersButtons(); // 全メンバーのボタン群
  renderTable();
});

// ========== ボタン群のレンダリング ==========
function renderAllMembersButtons() {
  const wrap = document.getElementById("member-tabs");
  if (!wrap) return;
  wrap.innerHTML = "";

  // 全員（全期）ボタン
  const allAllBtn = document.createElement("button");
  allAllBtn.textContent = "全員（全期）";
  allAllBtn.addEventListener("click", () => {
    viewScope = "all";
    selectedMember = "";
    renderTable();
  });
  wrap.appendChild(allAllBtn);

  // 期ごとの見出し＋ボタン群
  [["2nd","二期生"],["3rd","三期生"],["4th","四期生"]].forEach(([gen, label]) => {
    const h = document.createElement("div");
    h.style.margin = "10px 0 6px";
    h.style.fontWeight = "bold";
    h.textContent = `【${label}】`;
    wrap.appendChild(h);

    // この期の全員ボタン（← 期だけを正しく表示）
    const genAllBtn = document.createElement("button");
    genAllBtn.textContent = "この期の全員";
    genAllBtn.style.marginRight = "8px";
    genAllBtn.addEventListener("click", () => {
      currentGen = gen;
      viewScope = "gen";     // ← 修正点：この期限定で表示
      selectedMember = "";
      renderTable();
    });
    wrap.appendChild(genAllBtn);

    // メンバー個別ボタン
    getMembersOf(gen).forEach(member => {
      const btn = document.createElement("button");
      btn.textContent = member;
      btn.style.margin = "2px";
      btn.addEventListener("click", () => {
        currentGen = gen;     // その期にセット
        viewScope = "member"; // 個別モード
        selectedMember = member;
        renderTable();
      });
      wrap.appendChild(btn);
    });
  });
}

// 期タブ（ページ上部の期切替）で使う：その期のボタンだけ並べたい時
function renderGenMemberButtons() {
  const wrap = document.getElementById("member-tabs");
  if (!wrap) return;
  wrap.innerHTML = "";

  // 期の全員
  const genAllBtn = document.createElement("button");
  genAllBtn.textContent = "この期の全員";
  genAllBtn.addEventListener("click", () => {
    viewScope = "gen";
    selectedMember = "";
    renderTable();
  });
  wrap.appendChild(genAllBtn);

  getMembersOf(currentGen).forEach(member => {
    const btn = document.createElement("button");
    btn.textContent = member;
    btn.style.margin = "2px";
    btn.addEventListener("click", () => {
      viewScope = "member";
      selectedMember = member;
      renderTable();
    });
    wrap.appendChild(btn);
  });
}

// ========== 表描画 ==========
function renderTable() {
  const tbody = document.querySelector("#list-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (currentTab === "member") {
    let rows = [];
    if (viewScope === "all") {
      rows = getCombinedRows();                 // 全期まとめ
    } else if (viewScope === "gen") {
      rows = allData[currentGen];               // この期のみ
    } else if (viewScope === "member") {
      rows = allData[currentGen].filter(([m]) => m === selectedMember);
    }

    rows.forEach(([member, item, pose]) => {
      const id = enc(`${member}_${item}_${pose}`);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${member}</td>
        <td>${item}</td>
        <td>${pose}</td>
        <td><input type="checkbox" ${lists.want.has(id) ? "checked" : ""}></td>
        <td><input type="checkbox" ${lists.provide.has(id) ? "checked" : ""}></td>
        <td><input type="checkbox" ${lists.own.has(id) ? "checked" : ""}></td>
      `;
      const [cw, cp, co] = tr.querySelectorAll("input[type=checkbox]");
      cw.addEventListener("change", e => e.target.checked ? tempChecked.want.add(id)    : tempChecked.want.delete(id));
      cp.addEventListener("change", e => e.target.checked ? tempChecked.provide.add(id) : tempChecked.provide.delete(id));
      co.addEventListener("change", e => e.target.checked ? tempChecked.own.add(id)     : tempChecked.own.delete(id));
      tbody.appendChild(tr);
    });

    if (rows.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6">表示できるデータがありません</td>`;
      tbody.appendChild(tr);
    }

  } else {
    // 欲しい/提供/所持 タブ
    const ids = Array.from(lists[currentTab]);
    if (ids.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6">まだありません</td>`;
      tbody.appendChild(tr);
      return;
    }
    ids.forEach(id => {
      const [member, item, ...rest] = dec(id).split("_");
      const pose = rest.join("_");
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${member}</td>
        <td>${item}</td>
        <td>${pose}</td>
        <td><input type="checkbox" ${currentTab==='want'   ? "checked" : ""}></td>
        <td><input type="checkbox" ${currentTab==='provide'? "checked" : ""}></td>
        <td><input type="checkbox" ${currentTab==='own'    ? "checked" : ""}></td>
      `;
      const [cw, cp, co] = tr.querySelectorAll("input[type=checkbox]");
      cw.addEventListener("change", e => e.target.checked ? tempChecked.want.add(id)    : tempChecked.want.delete(id));
      cp.addEventListener("change", e => e.target.checked ? tempChecked.provide.add(id) : tempChecked.provide.delete(id));
      co.addEventListener("change", e => e.target.checked ? tempChecked.own.add(id)     : tempChecked.own.delete(id));
      tbody.appendChild(tr);
    });
  }
}

// ========== 保存・リセット ==========
document.getElementById("save-btn")?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) { alert("ログインが必要です"); return; }

  ["want","provide","own"].forEach(type => {
    tempChecked[type].forEach(id => lists[type].add(id));
    tempChecked[type].clear();
  });

  await window.saveMyList(user.uid, {
    want: Array.from(lists.want),
    provide: Array.from(lists.provide),
    own: Array.from(lists.own)
  });
  alert("Firestoreに保存しました！");
  renderTable();
});

document.getElementById("reset-btn")?.addEventListener("click", async () => {
  if (!confirm("すべてのチェックをリセットしますか？")) return;
  const user = auth.currentUser;
  if (!user) return;

  lists.want.clear();
  lists.provide.clear();
  lists.own.clear();
  await window.saveMyList(user.uid, { want: [], provide: [], own: [] });
  alert("リセットしました（Firestore）");
  renderTable();
});

// ========== タブ切替 ==========
document.getElementById("main-tabs")?.addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;
  document.querySelectorAll("#main-tabs button").forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");

  currentTab = e.target.dataset.tab;

  if (currentTab === "member") {
    // メンバー一覧を押したら、全メンバーのボタンを表示
    viewScope = "all";
    selectedMember = "";
    renderAllMembersButtons();
  } else {
    // 他タブならメンバーボタンは消してOK（必要なら残しても可）
    const wrap = document.getElementById("member-tabs");
    if (wrap) wrap.innerHTML = "";
  }
  renderTable();
});

document.getElementById("generation-tabs")?.addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;
  document.querySelectorAll("#generation-tabs button").forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");

  currentGen = e.target.dataset.gen; // "2nd" | "3rd" | "4th"
  // 期タブを触ったら、期内のボタン群に切替（この期の全員/個別）
  viewScope = "gen";
  selectedMember = "";
  renderGenMemberButtons();
  renderTable();
});

