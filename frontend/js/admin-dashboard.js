<<<<<<< HEAD
async function loadAdmin(){const meResponse=await fetch('/api/admin-auth/me');if(meResponse.status===401)return location.href='/admin/login.html';const me=await meResponse.json();adminName.textContent=me.admin.fullName;const response=await fetch('/api/dashboard/admin');if(response.ok){const data=await response.json();residentCount.textContent=data.residents;householdCount.textContent=data.households;adminCount.textContent=data.admins;}}
document.getElementById('logoutButton').onclick=async()=>{await fetch('/api/admin-auth/logout',{method:'POST'});location.href='/'};
async function loadCounts(){const [r,c]=await Promise.all([fetch('/api/requests/admin'),fetch('/api/concerns/admin')]);if(r.ok)requestCount.textContent=(await r.json()).requests.length;if(c.ok){const rows=(await c.json()).concerns;const el=document.getElementById('concernCount');if(el)el.textContent=rows.filter(x=>x.status!=='Resolved'&&x.status!=='Rejected').length;}}
loadAdmin();loadCounts();
=======
async function loadAdmin() {
  const meResponse = await fetch("/api/admin-auth/me");
  if (meResponse.status === 401) {
    window.location.href = "/admin/login.html";
    return;
  }

  const me = await meResponse.json();
  document.getElementById("adminName").textContent = me.admin.fullName;

  const response = await fetch("/api/dashboard/admin");
  if (!response.ok) return;

  const data = await response.json();
  document.getElementById("residentCount").textContent = data.residents;
  document.getElementById("householdCount").textContent = data.households;
  document.getElementById("adminCount").textContent = data.admins;
}

document.getElementById("logoutButton").addEventListener("click", async () => {
  await fetch("/api/admin-auth/logout", { method: "POST" });
  window.location.href = "/";
});

loadAdmin();
>>>>>>> f306956f3c2100a930787040fe4b05e0bb925221
