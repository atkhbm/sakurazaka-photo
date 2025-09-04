
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import "../firebase.js";

const auth = window.firebaseAuth;

let allData = [];
let currentTab = "member";
let selectedMember = "";

const lists = { want: new Set(), provide: new Set(), own: new Set() };
const tempChecked = { want: new Set(), provide: new Set(), own: new Set() };

// Firestoreから読込
async function loadLists(userId) {
  const data = await window.loadMyList(userId);
  lists.want = new Set(data.want || []);
  lists.provide = new Set(data.provide || []);
  lists.own = new Set(data.own || []);
  renderTable();
}

// CSV読込
fetch("https://raw.githubusercontent.com/atkhbm/sakurazaka-photo/refs/heads/main/sakurazaka_master_full.csv")
  .then(res => res.text())
  .then(text => {
    const rows = text.trim().split("\n").slice(1).map(line => {
      return line.match(/(".*?"|[^",]+)(?=,|$)/g).map(cell => cell.replace(/^"|"$/g, ""));
    });
    allData = rows;
    renderMemberTabs();

    onAuthStateChanged(auth, (user) => {
      if (user) {
        loadLists(user.uid);
      } else {
        location.href = "login.html";
      }
    });
  });

// メンバータブ作成
function renderMemberTabs() {
  const memberTabs = document.getElementById("member-tabs");
  const members = [...new Set(allData.map(row => row[0]))];
  memberTabs.innerHTML = "";
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

// 表描画
function renderTable() {
  const tbody = document.querySelector("#list-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  allData.forEach(([member, item, pose]) => {
    const rawId = `${member}_${item}_${pose}`;
    const id = encodeURIComponent(rawId);
    const isChecked = (type) => lists[type].has(id) || tempChecked[type].has(id);

    if (currentTab === "member") {
      if (!selectedMember || selectedMember !== member) return;
      if (lists.want.has(id) || lists.provide.has(id) || lists.own.has(id)) return;
    } else if (currentTab !== "member" && !lists[currentTab].has(id)) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${member}</td>
      <td>${item}</td>
      <td>${pose}</td>
      <td><input type="checkbox" ${isChecked('want') ? "checked" : ""}></td>
      <td><input type="checkbox" ${isChecked('provide') ? "checked" : ""}></td>
      <td><input type="checkbox" ${isChecked('own') ? "checked" : ""}></td>
    `;

    const inputs = tr.querySelectorAll("input[type=checkbox]");
    ["want","provide","own"].forEach((type, i) => {
      inputs[i].addEventListener("change", (ev) => {
        if (ev.target.checked) {
          tempChecked[type].add(id);
        } else {
          tempChecked[type].delete(id);
        }
      });
    });

    tbody.appendChild(tr);
  });
}

// 保存
document.getElementById("save-btn")?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) { alert("ログインが必要です"); return; }

  ['want', 'provide', 'own'].forEach(type => {
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

// リセット
document.getElementById("reset-btn")?.addEventListener("click", async () => {
  if (!confirm("すべてのチェックをリセットしますか？")) return;
  const user = auth.currentUser;
  if (!user) { return; }

  lists.want.clear();
  lists.provide.clear();
  lists.own.clear();

  await window.saveMyList(user.uid, { want: [], provide: [], own: [] });
  alert("リセットしました（Firestore）");
  renderTable();
});

// メインタブ切替
document.getElementById("main-tabs")?.addEventListener("click", (e) => {
  if (e.target.tagName === "BUTTON") {
    document.querySelectorAll("#main-tabs button").forEach(btn => btn.classList.remove("active"));
    e.target.classList.add("active");
    currentTab = e.target.dataset.tab;
    selectedMember = "";
    renderTable();
  }
});
