import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// --- Your Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyCbzEw-EpNrUIcLeAcWxAH1PE318Bxh-5I",
  authDomain: "sebbygames-61beb.firebaseapp.com",
  projectId: "sebbygames-61beb",
  storageBucket: "sebbygames-61beb.firebasestorage.app",
  messagingSenderId: "344907692435",
  appId: "1:344907692435:web:8c4c2d716e8c180f3cd066"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Elements ---
const authScreen = document.getElementById("auth-screen");
const chatScreen = document.getElementById("chat-screen");
const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const googleBtn = document.getElementById("google-btn");
const signoutBtn = document.getElementById("signout-btn");
const messagesDiv = document.getElementById("messages");
const msgForm = document.getElementById("message-form");
const msgInput = document.getElementById("message-input");
const userName = document.getElementById("user-name");
const userEmail = document.getElementById("user-email");

let unsubscribeChat = null;
let msgSubmitListener = null;

// --- Sign In / Register ---
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) return alert("Please fill in both fields");

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found") {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Account created successfully!");
      } catch (createErr) {
        alert("Error creating account: " + createErr.message);
      }
    } else {
      alert("Login failed: " + error.message);
    }
  }
});

// --- Google Sign-In ---
googleBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    alert(error.message);
  }
});

// --- Sign Out ---
signoutBtn.addEventListener("click", () => {
  if (unsubscribeChat) unsubscribeChat();
  if (msgSubmitListener) msgForm.removeEventListener("submit", msgSubmitListener);
  signOut(auth);
});

// --- Auth State Change ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    authScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");
    userName.textContent = user.displayName || user.email.split("@")[0];
    userEmail.textContent = user.email;
    startChat(user);
  } else {
    chatScreen.classList.add("hidden");
    authScreen.classList.remove("hidden");
  }
});

// --- Chat ---
function startChat(user) {
  if (unsubscribeChat) unsubscribeChat();
  if (msgSubmitListener) {
    msgForm.removeEventListener("submit", msgSubmitListener);
  }

  const q = query(collection(db, "messages"), orderBy("createdAt"));
  unsubscribeChat = onSnapshot(q, (snapshot) => {
    messagesDiv.innerHTML = "";
    snapshot.forEach((doc) => {
      const msg = doc.data();
      const div = document.createElement("div");
      div.className = msg.uid === user.uid ? "msg me" : "msg";
      div.textContent = `${msg.displayName || msg.email}: ${msg.text}`;
      messagesDiv.appendChild(div);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });

  msgSubmitListener = async (e) => {
    e.preventDefault();
    const text = msgInput.value.trim();
    if (!text) return;

    await addDoc(collection(db, "messages"), {
      text,
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split("@")[0],
      createdAt: serverTimestamp(),
    });

    msgInput.value = "";
    messagesDiv.scrollTo({
      top: messagesDiv.scrollHeight,
      behavior: "smooth",
    });
  };

  msgForm.addEventListener("submit", msgSubmitListener);
}
