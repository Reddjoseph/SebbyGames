import {
  getAuth,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  setDoc,
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

const voucherList = document.getElementById("voucher-list");
const adminList = document.getElementById("admin-voucher-list");
const voucherForm = document.getElementById("voucher-form");
const redeemForm = document.getElementById("redeem-form");
const adminSection = document.getElementById("admin-section");
const userSection = document.getElementById("user-section");

/* ---------------------------
   Helpers
   --------------------------- */
function showToast(message, type = "info") {
  const t = document.createElement("div");
  t.className = "toast show";
  t.textContent = message;
  t.style.background =
    type === "error"
      ? "#e74c3c"
      : type === "success"
      ? "#27ae60"
      : "#0078ff";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2300);
}

function generateVoucherCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = Math.floor(1000 + Math.random() * 9000);
  const randLetters =
    letters[Math.floor(Math.random() * 26)] +
    letters[Math.floor(Math.random() * 26)] +
    letters[Math.floor(Math.random() * 26)] +
    letters[Math.floor(Math.random() * 26)] +
    letters[Math.floor(Math.random() * 26)];
  return `SBBY-${numbers}${randLetters}`;
}
function generateVoucherID() {
  return "voucher-" + Math.random().toString(36).substring(2, 10);
}

/* ---------------------------
   Modal for delete confirmation
   --------------------------- */
function showDeleteModal(voucher, onConfirm) {
  const modal = document.getElementById("deleteModal");
  const msg = document.getElementById("deleteMessage");
  msg.textContent = `Are you sure you want to delete "${voucher.name}"?`;

  modal.classList.add("show");

  const confirmBtn = document.getElementById("confirmDelete");
  const cancelBtn = document.getElementById("cancelDelete");

  const closeModal = () => modal.classList.remove("show");

  confirmBtn.onclick = async () => {
    closeModal();
    await onConfirm();
  };
  cancelBtn.onclick = closeModal;
}

/* ---------------------------
   Role check
   --------------------------- */
async function checkRole(uid) {
  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    if (!userSnap.exists()) return false;
    const role = userSnap.data().role;
    return role === "admin";
  } catch (err) {
    console.error("[Role Check] error:", err);
    return false;
  }
}

/* ---------------------------
   Admin: load all vouchers
   --------------------------- */
async function loadAdminVouchers() {
  adminList.innerHTML = `<p style="color:#aaa">Loading vouchers…</p>`;
  try {
    const snap = await getDocs(collection(db, "vouchers"));
    adminList.innerHTML = "";
    snap.forEach((d) => {
      const v = d.data();
      const card = document.createElement("div");
      card.className = "admin-voucher";
      card.innerHTML = `
        <h4>${v.name}</h4>
        <p>${v.description || "No description"}</p>
        <p><strong>Code:</strong> <span class="voucher-code">${v.code}</span>
          <i class="fa-regular fa-copy copy-icon" title="Copy code"></i>
          <span class="copy-feedback">Copied!</span>
        </p>
        <p><small>Expires: ${v.expiration || "N/A"}</small></p>
        <div class="admin-actions">
          <button class="btn-delete">Delete</button>
        </div>
      `;

      // Claimed badge
      if (v.claimed && v.claimedBy) {
        const badge = document.createElement("div");
        badge.className = "claimed-badge";
        badge.innerHTML = `
          <div class="claimed-dot"></div>
          <div class="claimed-label">Claimed</div>
          <div class="claimer-tip">${v.claimedBy.email || "unknown"}</div>
        `;
        card.appendChild(badge);
      }

      // Copy code logic
      const copyIcon = card.querySelector(".copy-icon");
      const feedback = card.querySelector(".copy-feedback");
      copyIcon.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(v.code);
          feedback.classList.add("show");
          setTimeout(() => feedback.classList.remove("show"), 1400);
        } catch {
          showToast("Copy failed", "error");
        }
      });

      // Delete logic (with fade + modal)
      card.querySelector(".btn-delete").onclick = () => {
        showDeleteModal(v, async () => {
          try {
            console.log("[Admin] Deleting:", v.id);
            await deleteDoc(doc(db, "vouchers", v.id));

            // Remove from all users’ wallets
            const usersSnap = await getDocs(collection(db, "users"));
            const deletions = usersSnap.docs.map((u) =>
              deleteDoc(doc(db, "users", u.id, "vouchers", v.id)).catch(() => {})
            );
            await Promise.all(deletions);

            // fade out card
            card.classList.add("fade-out");
            setTimeout(() => card.remove(), 400);

            showToast("Voucher deleted everywhere.", "success");
          } catch (err) {
            console.error("[Admin] delete error:", err);
            showToast("Error deleting voucher.", "error");
          }
        });
      };

      adminList.appendChild(card);
    });
    if (!adminList.innerHTML)
      adminList.innerHTML = `<p style="color:#777">No vouchers yet.</p>`;
  } catch (err) {
    console.error("[Admin] load error:", err);
    adminList.innerHTML = `<p style="color:#e88">Load failed.</p>`;
  }
}

/* ---------------------------
   User: load redeemed vouchers
   --------------------------- */
async function loadUserVouchers(uid) {
  voucherList.innerHTML = `<p style="color:#aaa">Loading vouchers…</p>`;
  const redeemedSnap = await getDocs(collection(db, "users", uid, "vouchers"));
  voucherList.innerHTML = "";
  redeemedSnap.forEach((d) => {
    const v = d.data();
    const item = document.createElement("div");
    item.className = "voucher-item redeemed";
    item.innerHTML = `
      <h4>${v.name}</h4>
      <p>${v.description || "No description."}</p>
      <p class="expires">Expires: ${v.expiration || "N/A"}</p>
      <p style="font-size:12px;color:#aaa;">Code: ${v.code}</p>
    `;
    voucherList.appendChild(item);
  });
  if (redeemedSnap.empty)
    voucherList.innerHTML = `<p style="color:#777">No redeemed vouchers yet.</p>`;
}

/* ---------------------------
   Admin: create voucher
   --------------------------- */
voucherForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return showToast("Not signed in", "error");

  const isAdmin = await checkRole(user.uid);
  if (!isAdmin) return showToast("Unauthorized", "error");

  const name = document.getElementById("voucher-name").value.trim();
  const desc = document.getElementById("voucher-desc").value.trim();
  const exp = document.getElementById("voucher-exp").value;
  if (!name || !exp) return showToast("Fill required fields.", "error");

  const id = generateVoucherID();
  const code = generateVoucherCode();

  const data = {
    id,
    name,
    description: desc,
    expiration: exp,
    code,
    createdAt: serverTimestamp(),
    claimed: false,
    claimedBy: null,
  };

  try {
    await setDoc(doc(db, "vouchers", id), data);
    showToast("Voucher created!", "success");
    voucherForm.reset();
    loadAdminVouchers();
  } catch (err) {
    console.error("[Admin] create error:", err);
    showToast("Failed to create voucher.", "error");
  }
});

/* ---------------------------
   User: redeem voucher
   --------------------------- */
redeemForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return showToast("Please login", "error");

  const code = document.getElementById("redeem-code").value.trim().toLowerCase();
  if (!code) return showToast("Enter a code", "error");

  try {
    const vouchersSnap = await getDocs(collection(db, "vouchers"));
    let foundDoc = null;
    vouchersSnap.forEach((d) => {
      if (d.data().code.toLowerCase() === code) foundDoc = d;
    });

    if (!foundDoc) return showToast("Invalid voucher code.", "error");

    const v = foundDoc.data();
    if (v.claimed) return showToast("Already claimed.", "error");

    if (v.expiration && new Date(v.expiration) < new Date())
      return showToast("Voucher expired.", "error");

    await setDoc(doc(db, "users", user.uid, "vouchers", v.id), {
      ...v,
      redeemedAt: serverTimestamp(),
      redeemedBy: { uid: user.uid, email: user.email },
    });

    await updateDoc(doc(db, "vouchers", v.id), {
      claimed: true,
      claimedBy: { uid: user.uid, email: user.email },
      claimedAt: serverTimestamp(),
    });

    showToast("Voucher redeemed!", "success");
    redeemForm.reset();
    loadUserVouchers(user.uid);
    loadAdminVouchers();
  } catch (err) {
    console.error("[User] redeem error:", err);
    showToast("Redeem failed.", "error");
  }
});

/* ---------------------------
   Auth handler
   --------------------------- */
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  const isAdmin = await checkRole(user.uid);
  if (isAdmin) {
    adminSection.classList.remove("hidden");
    userSection.classList.add("hidden");
    loadAdminVouchers();
  } else {
    adminSection.classList.add("hidden");
    userSection.classList.remove("hidden");
    loadUserVouchers(user.uid);
  }
});
