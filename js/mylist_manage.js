import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import "../firebase.js";

const auth = window.firebaseAuth;

// 期別CSVを保持
let allData = { "2nd": [], "3rd": [], "4th": [] };
let currentTab = "member";     // "member" | "want" | "provide" | "own"
let currentGen = "2nd";        // "2nd" | "3rd" | "4th"
let selectedMember = "";       // 個別メンバー名（空なら全員表示）

// Firestore状態
const lists = { want: new Set(), provide: new Set(), own: new Set() };
const tempChecked = { want: new Set(), provide: new Set(), own: new Set() };

// ---------- ユーティリティ ----------
const enc = (s) => encodeURIComponent(s ?? "");
const dec = (s) => decodeURIComponent(s ?? "");

// 全期を結合して返す
function getCombinedRows() {
  return [...allData["2nd"], ...allData["3rd"], ...allData["4th"]];
}

// メンバー名一覧（期をまたいで重複排除）
function getMembersOf(gen) {
  const rows = gen ? allData[gen] : getCombinedRows();
  return [...new Set(rows.map(r => r[0]))];
}

// ---------- CSV読み込み ----------
async function loadCSV(gen, url) {
  const res = await fetch(url);
  const text = await res.text();
  const rows = text.trim().split("\n").slice(1).map(line =>
    line.match(/(".*?"|[^",]+)(?=,|$)/g).map(cell => cell.replace(/^"|"$/g, ""))
  );
  allData[gen] = rows; // 期待カラム: [member, item, pose]
}

// ---------- Firestore ----------
async function loadLists(userId) {
  const data = await window.loadMyList(userId);
  lists.want = new Set(data.want || []);
  lists.provide = new Set(data.provide || []);
  lists.own = new Set(data.own || []);
  renderTable();
}

// ---------- 初期化 ----------
Promise.all([
  loadCSV("2nd", "sakurazaka_2nd_gen.csv"),
  loadCSV("3rd", "sakurazaka_3rd_gen.csv"),
  loadCSV("4th", "sakurazaka_4th_gen.csv"),
]).then(() => {
  // 期タブ表示
  document.getElementById("generation-tabs").style.display = "block";

  // 認証
  onAuthStateChanged(auth, (user) => {
    if (user) loadLists(user.uid);
    else location.href = "login.html";
  });

  renderMemberTabs(); // デフォは currentGen=2nd のメンバータブを出す
  renderTable();      // ← ここで「メンバー一覧」= 全員表示をすぐ出せるようにしておく
});

// ---------- メンバータブ（期ごと） ----------
function renderMemberTabs() {
  const memberTabs = document.getElementById("member-tabs");
  const members = getMembersOf(currentGen);
  memberTabs.innerHTML = "";

  // 「全員」ショートカット（期タブの中の全員でもOK）
  const allBtn = document.createElement("button");
  allBtn.textContent = "（この期の）全員";
  allBtn.addEventListener("click", () => {
    selectedMember = ""; // その期の全員表示
    renderTable();
  });
  memberTabs.appendChild(allBtn);

  members.forEach(member => {
    const btn = document.createElement("button");
    btn.textContent = member;
    btn.addEventListener("click", () => {
      selectedMember = member;
      renderTable();
    });
    memberTabs.appendChild(btn);
  });
}

// ---------- 表描画 ----------
function renderTable() {
  const tbody = document.querySelector("#list-table tbody");
  tbody.innerHTML = "";

  if (currentTab === "member") {
    // 「メンバー一覧」タブの表示ルール：
    // 1) selectedMember が空なら、全期結合を表示（＝ご要望どおり全メンバー一覧）
    // 2) selectedMember があれば、そのメンバーのみ表示（currentGenに依存）
    const sourceRows = selectedMember
      ? allData[currentGen].filter(([m]) => m === selectedMember)
      : getCombinedRows(); // ← 全期のCSVを結合

    sourceRows.forEach(([member, item, pose]) => {
      const id = enc(`${member}_${item}_${pose}`);

      // 既にどれかのリストに入っているものを隠したい場合は以下を有効化
      // if (lists.want.has(id) || lists.provide.has(id) || lists.own.has(id)) return;

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
      cw.addEventListener("change", (e) => {
        e.target.checked ? tempChecked.want.add(id) : tempChecked.want.delete(id);
      });
      cp.addEventListener("change", (e) => {
        e.target.checked ? tempChecked.provide.add(id) : tempChecked.provide.delete(id);
      });
      co.addEventListener("change", (e) => {
        e.target.checked ? tempChecked.own.add(id) : tempChecked.own.delete(id);
      });

      tbody.appendChild(tr);
    });

  } else {
    // 「欲しい/提供/所持」タブは Firestore のセットから直に描画
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
      cw.addEventListener("change", (e) => { e.target.checked ? tempChecked.want.add(id) : tempChecked.want.delete(id); });
      cp.addEventListener("change", (e) => { e.target.checked ? tempChecked.provide.add(id) : tempChecked.provide.delete(id); });
      co.addEventListener("change", (e) => { e.target.checked ? tempChecked.own.add(id) : tempChecked.own.delete(id); });

      tbody.appendChild(tr);
    });
  }
}

// ---------- 保存 ----------
document.getElementById("save-btn").addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) { alert("ログインが必要です"); return; }

  ['want','provide','own'].forEach(type => {
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

// ---------- リセット ----------
document.getElementById("reset-btn").addEventListener("click", async () => {
  if (!confirm("すべてのチェックをリセットしますか？")) return;
  const user = auth.currentUser;
  if (!user) return;

  lists.want.clear();
  lists.provide.clear();
  lists.own.clear();

  await window.saveMyList(user.uid, { want:[], provide:[], own:[] });
  alert("リセットしました（Firestore）");
  renderTable();
});

// ---------- メインタブ切り替え ----------
document.getElementById("main-tabs").addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;

  document.querySelectorAll("#main-tabs button").forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");

  currentTab = e.target.dataset.tab;
  if (currentTab === "member") {
    // 「メンバー一覧」を押した瞬間、全員表示（結合）にする
    selectedMember = "";
  }
  renderTable();
});

// ---------- 期タブ切り替え ----------
document.getElementById("generation-tabs").addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;

  document.querySelectorAll("#generation-tabs button").forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");

  currentGen = e.target.dataset.gen;
  selectedMember = ""; // 期内の全員に一旦戻す
  renderMemberTabs();
  renderTable();
});
