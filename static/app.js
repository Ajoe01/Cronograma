/* =============================================
   CRONOGRAMA UTB — app.js (ACTUALIZADO)
   ============================================= */

let me        = null;   // usuario activo
let editId    = null;   // id de actividad en edición
let pendiente = null;   // id pendiente de completar
let filtroAct = 'todas';

// ==================== TABS LOGIN ====================
function switchTab(t) {
  document.querySelectorAll('.auth-tab').forEach((b, i) =>
    b.classList.toggle('active', (i === 0 && t === 'login') || (i === 1 && t === 'reg'))
  );
  document.getElementById('tabLogin').style.display = t === 'login' ? '' : 'none';
  document.getElementById('tabReg').style.display   = t === 'reg'   ? '' : 'none';
  if (t === 'reg') actualizarContador();
}

function actualizarContador() {
  fetch('/api/usuarios/count')
    .then(r => r.json())
    .then(d => document.getElementById('cntUsers').textContent = d.count);
}

// ==================== REGISTRO ====================
function registrar() {
  const nombre = document.getElementById('rNombre').value.trim();
  const user   = document.getElementById('rUser').value.trim().toLowerCase().replace(/\s+/g, '');
  const cargo  = document.getElementById('rCargo').value;
  const pass   = document.getElementById('rPass').value;
  const pass2  = document.getElementById('rPass2').value;
  const msg    = document.getElementById('rMsg');

  const show = (t, c) => { msg.textContent = t; msg.className = `auth-msg ${c}`; msg.style.display = 'block'; };

  if (!nombre || !user || !cargo || !pass || !pass2) return show('⚠️ Completa todos los campos', 'error');
  if (pass.length < 4)  return show('⚠️ Contraseña mínimo 4 caracteres', 'error');
  if (pass !== pass2)   return show('⚠️ Las contraseñas no coinciden', 'error');

  fetch('/api/usuarios/registrar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, user, cargo, pass })
  })
    .then(r => r.json())
    .then(d => {
      if (d.ok) {
        show('✅ Cuenta creada. Ahora inicia sesión.', 'ok');
        setTimeout(() => switchTab('login'), 1500);
        ['rNombre', 'rUser', 'rPass', 'rPass2'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('rCargo').value = '';
      } else {
        show(`❌ ${d.error}`, 'error');
      }
    })
    .catch(() => show('❌ Error de conexión', 'error'));
}

// ==================== LOGIN ====================
function login() {
  const user = document.getElementById('liUser').value.trim().toLowerCase();
  const pass = document.getElementById('liPass').value;
  const msg  = document.getElementById('liMsg');

  fetch('/api/usuarios/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, pass })
  })
    .then(r => r.json())
    .then(d => {
      if (d.ok) {
        me = d.usuario;
        document.getElementById('curUser').textContent  = me.nombre || me.user;
        document.getElementById('curCargo').textContent = me.cargo  || '';
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appScreen').style.display   = 'block';
        msg.style.display = 'none';
        cargar();
      } else {
        msg.textContent   = '❌ Usuario o contraseña incorrectos';
        msg.className     = 'auth-msg error';
        msg.style.display = 'block';
        document.getElementById('liPass').value = '';
      }
    })
    .catch(() => {
      msg.textContent   = '❌ Error de conexión';
      msg.className     = 'auth-msg error';
      msg.style.display = 'block';
    });
}

function logout() {
  me = null;
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appScreen').style.display   = 'none';
}

// ==================== LÓGICA DE ESTADO ====================
function getEstado(act) {
  if (!act.completada) return 'default';
  const lim  = new Date(act.fecha_limite  + 'T00:00:00');
  const comp = new Date(act.fecha_completado + 'T00:00:00');
  const diff = Math.round((comp - lim) / 86400000); 
  if (diff < -7)  return 'prematuro';
  if (diff <= 0)  return 'tiempo';   
  if (diff <= 7)  return 'leve';     
  return 'tarde';                    
}

const ELABEL = { default: 'En ejecución', prematuro: 'Prematuro 🔵', tiempo: 'A tiempo ✅', leve: 'Retraso leve', tarde: 'Retraso grave' };
const EBADGE = { default: 'b-default', prematuro: 'b-prematuro', tiempo: 'b-tiempo', leve: 'b-leve', tarde: 'b-tarde' };
const EROW   = { default: 'e-default', prematuro: 'e-prematuro', tiempo: 'e-tiempo', leve: 'e-leve', tarde: 'e-tarde' };
const PRIO   = { alta: '🔴 Alta', media: '🟡 Media', baja: '🟢 Baja' };

const ff = f => {
  if (!f) return '-';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
};

// ==================== MODAL ACTIVIDAD ====================
function abrirModal(id = null) {
  editId = id;
  const inputIni = document.getElementById("aIni");
  const inputLim = document.getElementById("aLim");
  
  if (id !== null) {
    // MODO EDICIÓN: Cargar y BLOQUEAR fechas
    fetch(`/api/actividades/${id}`)
      .then(r => r.json())
      .then(a => {
        document.getElementById('mTitle').textContent = '✏️ Editar Actividad';
        document.getElementById('aNom').value   = a.nombre;
        document.getElementById('aDesc').value  = a.descripcion || '';
        document.getElementById('aResp').value  = a.responsable;
        document.getElementById('aPrio').value  = a.prioridad || 'media';
        
        // Mantener fechas originales y bloquear
        inputIni.value = a.fecha_inicio || '';
        inputLim.value = a.fecha_limite || '';
        inputIni.readOnly = true;
        inputLim.readOnly = true;
        inputIni.style.backgroundColor = "#e9ecef";
        inputLim.style.backgroundColor = "#e9ecef";
      });
  } else {
    // MODO NUEVA: Limpiar y HABILITAR fechas
    document.getElementById('mTitle').textContent = '➕ Nueva Actividad';
    ['aNom', 'aDesc', 'aResp', 'aIni', 'aLim'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('aPrio').value = 'media';
    
    inputIni.readOnly = false;
    inputLim.readOnly = false;
    inputIni.style.backgroundColor = "#fff";
    inputLim.style.backgroundColor = "#fff";
  }
  document.getElementById('modalAct').classList.add('open');
  document.getElementById('modalAct').style.display = "flex";
}

function cerrarModal() {
  document.getElementById('modalAct').classList.remove('open');
  document.getElementById('modalAct').style.display = "none";
  editId = null;
}

function guardar() {
  const nombre      = document.getElementById('aNom').value.trim();
  const responsable = document.getElementById('aResp').value; // Toma el valor del SELECT
  const fechaInicio = document.getElementById('aIni').value;
  const fechaLimite = document.getElementById('aLim').value;

  if (!nombre || !responsable || !fechaInicio || !fechaLimite) {
    alert('⚠️ Completa todos los campos obligatorios');
    return;
  }

  const payload = {
    nombre,
    descripcion:  document.getElementById('aDesc').value,
    responsable,
    fecha_inicio: fechaInicio,
    fecha_limite: fechaLimite,
    prioridad:    document.getElementById('aPrio').value,
    creada_por:   me.user
  };

  const url    = editId !== null ? `/api/actividades/${editId}` : '/api/actividades';
  const method = editId !== null ? 'PUT' : 'POST';

  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(r => r.json())
    .then(d => {
      if (d.ok) { cerrarModal(); cargar(); }
      else alert(`❌ ${d.error}`);
    });
}

// ==================== COMPLETAR (ZONA HORARIA COLOMBIA) ====================
function solicitarCompletar(id) {
  pendiente = id;
  fetch(`/api/actividades/${id}`)
    .then(r => r.json())
    .then(a => {
      document.getElementById('confirmTxt').textContent =
        `"${a.nombre}" — Fecha límite: ${ff(a.fecha_limite)}.`;
      
      // FORZAR FECHA LOCAL DE COLOMBIA EN FORMATO DD/MM/AAAA
      const hoy = new Date();
      const fechaLatina = hoy.toLocaleDateString('es-CO', {
        timeZone: 'America/Bogota',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      const campoFecha = document.getElementById('fechaCompletado');
      campoFecha.value = fechaLatina;
      // Aseguramos que sea type text para que no cambie el orden
      campoFecha.type = "text"; 

      document.getElementById('confirmOv').classList.add('open');
      document.getElementById('confirmOv').style.display = "flex";
    });
}

function confirmarCompletar() {
  let fechaComp = document.getElementById('fechaCompletado').value; // "dd/mm/aaaa"
  if (!fechaComp) { alert('⚠️ Fecha requerida'); return; }

  // Convertir dd/mm/aaaa a aaaa-mm-dd para la base de datos
  const [d, m, y] = fechaComp.split('/');
  const fechaISO = `${y}-${m}-${d}`;

  fetch(`/api/actividades/${pendiente}/completar`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fecha_completado: fechaISO, completada_por: me.user })
  })
    .then(r => r.json())
    .then(d => {
      if (d.ok) { cerrarConfirm(); cargar(); }
      else alert(`❌ ${d.error}`);
    });
}

function cerrarConfirm() {
  document.getElementById('confirmOv').classList.remove('open');
  document.getElementById('confirmOv').style.display = "none";
  pendiente = null;
}

// ==================== ELIMINAR / FILTRAR / CARGAR ====================
function eliminar(id) {
  if (!confirm('¿Eliminar esta actividad?')) return;
  fetch(`/api/actividades/${id}`, { method: 'DELETE' }).then(r => r.json()).then(d => { if (d.ok) cargar(); });
}

function filtrar(e, btn) {
  filtroAct = e;
  document.querySelectorAll('.fb').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  cargar();
}

function cargar() {
  fetch('/api/actividades')
    .then(r => r.json())
    .then(acts => {
      const cnt = { total: acts.length, default: 0, prematuro: 0, tiempo: 0, leve: 0, tarde: 0 };
      acts.forEach(a => { const e = getEstado(a); cnt[e] = (cnt[e] || 0) + 1; });

      document.getElementById('statsGrid').innerHTML = `
        <div class="stat s-tot"><div class="sn">${cnt.total}</div><div class="sl">Total</div></div>
        <div class="stat s-am"><div class="sn">${cnt.default}</div><div class="sl">🟡 En ejecución</div></div>
        <div class="stat s-az"><div class="sn">${cnt.prematuro}</div><div class="sl">🔵 Prematuras</div></div>
        <div class="stat s-vd"><div class="sn">${cnt.tiempo}</div><div class="sl">🟢 A tiempo</div></div>
        <div class="stat s-na"><div class="sn">${cnt.leve}</div><div class="sl">🟠 Retraso leve</div></div>
        <div class="stat s-ro"><div class="sn">${cnt.tarde}</div><div class="sl">🔴 Retraso grave</div></div>`;

      const filtradas = filtroAct === 'todas' ? acts : acts.filter(a => getEstado(a) === filtroAct);
      const cont = document.getElementById('actList');

      if (!filtradas.length) {
        cont.innerHTML = '<div class="empty"><div class="ei">📭</div><p>No hay actividades</p></div>';
        return;
      }

      cont.innerHTML = filtradas.map(a => {
        const e = getEstado(a);
        const done = a.completada;
        const bComp = done ? `<button class="btn-a btn-lock" disabled>✅</button>` : `<button class="btn-a btn-comp" onclick="solicitarCompletar(${a.id})">✔</button>`;
        const bEdit = done ? `<button class="btn-a btn-lock" disabled>🔒</button>` : `<button class="btn-a btn-edit" onclick="abrirModal(${a.id})">✏️</button>`;
        
        return `
          <div class="a-row ${EROW[e]}">
            <div>
              <div class="a-nom ${done ? 'done' : ''}">${a.nombre}</div>
              <div class="a-meta">${PRIO[a.prioridad] || ''} · Creada por ${a.creada_por || '-'}</div>
              ${done ? `<div class="a-meta">✅ Completada el ${ff(a.fecha_completado)} por ${a.completada_por}</div>` : ''}
            </div>
            <div style="font-weight:600;color:#444;">${a.responsable}</div>
            <div>${ff(a.fecha_inicio)}</div>
            <div style="font-weight:600;">${ff(a.fecha_limite)}</div>
            <div><span class="badge ${EBADGE[e]}">${ELABEL[e]}</span></div>
            <div class="acc">${bComp}${bEdit}<button class="btn-a btn-del" onclick="eliminar(${a.id})">🗑</button></div>
          </div>`;
      }).join('');
    });
}

// Clic fuera para cerrar
window.onclick = function(event) {
  if (event.target == document.getElementById('modalAct')) cerrarModal();
  if (event.target == document.getElementById('confirmOv')) cerrarConfirm();
};
