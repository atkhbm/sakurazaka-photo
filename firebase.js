// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyD8fQFqmRA4BeR4ApXWk9RPxlP8uizFquk",
  authDomain: "sakurazaka-photo-trade.firebaseapp.com",
  projectId: "sakurazaka-photo-trade",
  storageBucket: "sakurazaka-photo-trade.firebasestorage.app",
  messagingSenderId: "83292956625",
  appId: "1:83292956625:web:4f102558cdc1809c3162f0",
  measurementId: "G-1ZS5CZ6364"
};

// 初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// グローバルで使えるように
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

