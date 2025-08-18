/**
 * 簡易ユーザー管理（開発用）
 * 本番では必ずFirebase/Supabase等に差し替えてください
 */
const LS_USERS = "app_users";       // 登録ユーザー一覧
const LS_SESSION = "app_session";   // 現在ログイン中のユーザー

function _loadUsers() {
  try { return JSON.parse(localStorage.getItem(LS_USERS)) || []; } catch { return []; }
}
function _saveUsers(users) {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}
function getSession() {
  try { return JSON.parse(localStorage.getItem(LS_SESSION)); } catch { return null; }
}
function setSession(user) {
  localStorage.setItem(LS_SESSION, JSON.stringify({ email: user.email, displayName: user.displayName }));
}
function clearSession() {
  localStorage.removeItem(LS_SESSION);
}

async function signUp({ email, password, displayName }) {
  const users = _loadUsers();
  const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) throw new Error("このメールアドレスは既に登録されています。");
  if (password.length < 8) throw new Error("パスワードは8文字以上にしてください。");

  const user = { email, password, displayName };
  users.push(user);
  _saveUsers(users);
  setSession(user);
  return { email: user.email, displayName: user.displayName };
}

async function signIn({ email, password }) {
  const users = _loadUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) throw new Error("メールアドレスまたはパスワードが正しくありません。");
  setSession(user);
  return { email: user.email, displayName: user.displayName };
}

function signOut() {
  clearSession();
}

function requireAuth(redirectTo = "login.html") {
  const s = getSession();
  if (!s) window.location.href = redirectTo;
  return s;
}

/** ヘッダーのボタン出し分け（ログイン中はマイページ/ログアウト、未ログインはログイン/新規登録） */
function renderHeaderAuthLinks() {
  const el = document.querySelector("[data-auth-links]");
  if (!el) return;
  const s = getSession();
  if (s) {
    el.innerHTML = `
      <a href="mypage.html">マイページ</a>
      <a href="#" id="logout-link">ログアウト</a>
    `;
    const logoutLink = document.getElementById("logout-link");
    logoutLink?.addEventListener("click", (e) => {
      e.preventDefault();
      signOut();
      location.href = "index.html";
    });
  } else {
    el.innerHTML = `
      <a href="login.html">ログイン</a>
      <a href="signup.html">新規登録</a>
    `;
  }
}
