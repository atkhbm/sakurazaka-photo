// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, setDoc, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// Firebase設定（CDNコードを反映済み）
const firebaseConfig = {
  apiKey: "AIzaSyD8fQFqmRA4BeR4ApXWk9RPxlP8uizFquk",
  authDomain: "sakurazaka-photo-trade.firebaseapp.com",
  projectId: "sakurazaka-photo-trade",
  storageBucket: "sakurazaka-photo-trade.appspot.com", // ← 修正ポイント
  messagingSenderId: "83292956625",
  appId: "1:83292956625:web:4f102558cdc1809c3162f0",
  measurementId: "G-1ZS5CZ6364"
};

// 初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// グローバル利用できるように
window.firebaseAuth = auth;
window.firebaseDB = db;

// ログアウト関数
window.doLogout = function() {
  signOut(auth).then(() => {
    location.href = "login.html";
  }).catch((e) => {
    alert("ログアウトに失敗しました: " + e.message);
  });
};

// ログイン必須チェック
window.requireLogin = function(callback) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      location.href = "login.html";
    } else {
      callback(user);
    }
  });
};

// Firestore にマイリスト保存
window.saveMyList = async function(userId, lists) {
  try {
    await setDoc(doc(db, "lists", userId), lists, { merge: true });
    console.log("保存完了:", lists);
  } catch (e) {
    console.error("保存エラー:", e);
    alert("保存に失敗しました");
  }
};

// Firestore からマイリスト読込
window.loadMyList = async function(userId) {
  try {
    const snap = await getDoc(doc(db, "lists", userId));
    if (snap.exists()) {
      console.log("データ取得:", snap.data());
      return snap.data();
    } else {
      console.log("データなし");
      return { want: [], provide: [], own: [] };
    }
  } catch (e) {
    console.error("読込エラー:", e);
    return { want: [], provide: [], own: [] };
  }
};

