/* =============================================
   CRONOGRAMA UTB — app.js
   Toda la lógica del frontend
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
  document.getElementById('liUser').value = '';
  document.getElementById('liPass').value = '';
  document.getElementById('liMsg').style.display = 'none';
}

// ==================== LÓGICA DE ESTADO ====================
/*
  El color depende de CUÁNDO se completó vs la fecha límite:
  - default   🟡 : No completada (en ejecución)
  - prematuro 🔵 : Completada más de 7 días ANTES del límite
  - tiempo    🟢 : Completada entre 7 días antes y el día límite (diff -7 a 0)
  - leve      🟠 : Completada entre 1 y 7 días DESPUÉS del límite
  - tarde     🔴 : Completada más de 7 días DESPUÉS del límite
*/
function getEstado(act) {
  if (!act.completada) return 'default';

  const lim  = new Date(act.fecha_limite  + 'T00:00:00');
  const comp = new Date(act.fecha_completado + 'T00:00:00');
  const diff = Math.round((comp - lim) / 86400000); // días (neg=antes, pos=después)

  if (diff < -7)  return 'prematuro'; // 🔵 más de 7d antes
  if (diff <= 0)  return 'tiempo';    // 🟢 hasta 7d antes y el día límite
  if (diff <= 7)  return 'leve';      // 🟠 hasta 7d después
  return 'tarde';                      // 🔴 más de 7d después
}

const ELABEL = {
  default:   'En ejecución',
  prematuro: 'Prematuro 🔵',
  tiempo:    'A tiempo ✅',
  leve:      'Retraso leve',
  tarde:     'Retraso grave'
};
const EBADGE = {
  default: 'b-default', prematuro: 'b-prematuro',
  tiempo:  'b-tiempo',  leve:      'b-leve', tarde: 'b-tarde'
};
const EROW = {
  default: 'e-default', prematuro: 'e-prematuro',
  tiempo:  'e-tiempo',  leve:      'e-leve', tarde: 'e-tarde'
};
const PRIO = { alta: '🔴 Alta', media: '🟡 Media', baja: '🟢 Baja' };

const ff = f => {
  if (!f) return '-';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
};

// ==================== MODAL ACTIVIDAD ====================
function abrirModal(id = null) {
  editId = id;
  if (id !== null) {
    fetch(`/api/actividades/${id}`)
      .then(r => r.json())
      .then(a => {
        document.getElementById('mTitle').textContent = '✏️ Editar Actividad';
        document.getElementById('aNom').value   = a.nombre;
        document.getElementById('aDesc').value  = a.descripcion || '';
        document.getElementById('aResp').value  = a.responsable;
        document.getElementById('aIni').value   = a.fecha_inicio || '';
        document.getElementById('aLim').value   = a.fecha_limite || '';
        document.getElementById('aPrio').value  = a.prioridad || 'media';
      });
  } else {
    document.getElementById('mTitle').textContent = '➕ Nueva Actividad';
    ['aNom', 'aDesc', 'aResp', 'aIni', 'aLim'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('aPrio').value = 'media';
  }
  document.getElementById('modalAct').classList.add('open');
}

function cerrarModal() {
  document.getElementById('modalAct').classList.remove('open');
  editId = null;
}

function guardar() {
  const nombre      = document.getElementById('aNom').value.trim();
  const responsable = document.getElementById('aResp').value.trim();
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

// ==================== COMPLETAR ====================
function solicitarCompletar(id) {
  pendiente = id;
  fetch(`/api/actividades/${id}`)
    .then(r => r.json())
    .then(a => {
      document.getElementById('confirmTxt').textContent =
        `"${a.nombre}" — Fecha límite: ${ff(a.fecha_limite)}. Indica la fecha real de finalización:`;
      document.getElementById('fechaCompletado').value = new Date().toISOString().split('T')[0];
      document.getElementById('confirmOv').classList.add('open');
    });
}

function confirmarCompletar() {
  const fechaComp = document.getElementById('fechaCompletado').value;
  if (!fechaComp) { alert('⚠️ Selecciona la fecha de completado'); return; }
  if (pendiente === null) return;

  fetch(`/api/actividades/${pendiente}/completar`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fecha_completado: fechaComp, completada_por: me.user })
  })
    .then(r => r.json())
    .then(d => {
      if (d.ok) { cerrarConfirm(); cargar(); }
      else alert(`❌ ${d.error}`);
    });
}

function cerrarConfirm() {
  document.getElementById('confirmOv').classList.remove('open');
  pendiente = null;
}

// ==================== ELIMINAR ====================
function eliminar(id) {
  if (!confirm('¿Eliminar esta actividad? Esta acción no se puede deshacer.')) return;
  fetch(`/api/actividades/${id}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(d => { if (d.ok) cargar(); });
}

// ==================== FILTRAR ====================
function filtrar(e, btn) {
  filtroAct = e;
  document.querySelectorAll('.fb').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  cargar();
}

// ==================== RENDER PRINCIPAL ====================
function cargar() {
  fetch('/api/actividades')
    .then(r => r.json())
    .then(acts => {
      const cnt = { total: acts.length, default: 0, prematuro: 0, tiempo: 0, leve: 0, tarde: 0 };
      acts.forEach(a => { const e = getEstado(a); cnt[e] = (cnt[e] || 0) + 1; });

      // Stats
      document.getElementById('statsGrid').innerHTML = `
        <div class="stat s-tot"><div class="sn">${cnt.total}</div><div class="sl">Total</div></div>
        <div class="stat s-am"><div class="sn">${cnt.default}</div><div class="sl">🟡 En ejecución</div></div>
        <div class="stat s-az"><div class="sn">${cnt.prematuro}</div><div class="sl">🔵 Prematuras</div></div>
        <div class="stat s-vd"><div class="sn">${cnt.tiempo}</div><div class="sl">🟢 A tiempo</div></div>
        <div class="stat s-na"><div class="sn">${cnt.leve}</div><div class="sl">🟠 Retraso leve</div></div>
        <div class="stat s-ro"><div class="sn">${cnt.tarde}</div><div class="sl">🔴 Retraso grave</div></div>`;

      // Filtrar
      const filtradas = filtroAct === 'todas' ? acts : acts.filter(a => getEstado(a) === filtroAct);
      const cont = document.getElementById('actList');

      if (!filtradas.length) {
        cont.innerHTML = '<div class="empty"><div class="ei">📭</div><p>No hay actividades en esta categoría</p></div>';
        return;
      }

      cont.innerHTML = filtradas.map(a => {
        const e    = getEstado(a);
        const done = a.completada;

        const bComp = done
          ? `<button class="btn-a btn-lock" disabled title="Ya completada">✅</button>`
          : `<button class="btn-a btn-comp" onclick="solicitarCompletar(${a.id})" title="Completar">✔</button>`;

        const bEdit = done
          ? `<button class="btn-a btn-lock" disabled title="Bloqueado">🔒</button>`
          : `<button class="btn-a btn-edit" onclick="abrirModal(${a.id})" title="Editar">✏️</button>`;

        const compInfo = done
          ? `<div class="a-meta">✅ Completada el ${ff(a.fecha_completado)} por ${a.completada_por}</div>`
          : '';

        return `
          <div class="a-row ${EROW[e]}">
            <div>
              <div class="a-nom ${done ? 'done' : ''}">${a.nombre}</div>
              ${a.descripcion ? `<div class="a-desc">${a.descripcion}</div>` : ''}
              <div class="a-meta">${PRIO[a.prioridad] || ''} · Creada por ${a.creada_por || '-'}</div>
              ${compInfo}
            </div>
            <div style="font-weight:600;color:#444;font-size:.88rem;">${a.responsable}</div>
            <div style="font-size:.86rem;color:#666;">${ff(a.fecha_inicio)}</div>
            <div style="font-size:.86rem;font-weight:600;">${ff(a.fecha_limite)}</div>
            <div><span class="badge ${EBADGE[e]}">${ELABEL[e]}</span></div>
            <div class="acc">${bComp}${bEdit}
              <button class="btn-a btn-del" onclick="eliminar(${a.id})" title="Eliminar">🗑</button>
            </div>
          </div>`;
      }).join('');
    });
}

// Cerrar modales al clic fuera
document.getElementById('modalAct').addEventListener('click', e => {
  if (e.target === document.getElementById('modalAct')) cerrarModal();
});
document.getElementById('confirmOv').addEventListener('click', e => {
  if (e.target === document.getElementById('confirmOv')) cerrarConfirm();

});

// Esta función debe integrarse con la que ya tienes en app.js
function abrirModal(id = null) {
    const inputInicio = document.getElementById("aIni");
    const inputLimite = document.getElementById("aLim");

    if (id) {
        // MODO EDICIÓN
        document.getElementById("mTitle").innerText = "Editar Actividad";
        // Bloqueamos las fechas
        inputInicio.readOnly = true;
        inputLimite.readOnly = true;
        // Opcional: añadir un estilo visual de bloqueo
        inputInicio.style.backgroundColor = "#f0f0f0";
        inputLimite.style.backgroundColor = "#f0f0f0";
        
        // Aquí iría tu lógica actual para cargar los datos de la actividad...
    } else {
        // MODO NUEVA ACTIVIDAD
        document.getElementById("mTitle").innerText = "Nueva Actividad";
        // Habilitamos las fechas
        inputInicio.readOnly = false;
        inputLimite.readOnly = false;
        inputInicio.style.backgroundColor = "white";
        inputLimite.style.backgroundColor = "white";
        
        // Limpiar campos si es nueva
        document.getElementById("aNom").value = "";
        document.getElementById("aResp").value = "";
        // ... etc
    }
    
    document.getElementById("modalAct").style.display = "flex";
}

function abrirConfirm() {
  const hoy = new Date();
  
  // Forzamos el formato local de Colombia dd/mm/aaaa
  // Esto garantiza que aunque sean las 11:59 PM, use la fecha de tu reloj
  const fechaLatina = hoy.toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Importante: Si tu input es type="date", no aceptará dd/mm/aaaa.
  // Por eso, cambiaremos el input a type="text" en el HTML.
  document.getElementById("fechaCompletado").value = fechaLatina;
  document.getElementById("confirmOv").style.display = "flex";
}

function abrirModal(id = null) {
  const inputIni = document.getElementById("aIni");
  const inputLim = document.getElementById("aLim");
  const selectResp = document.getElementById("aResp"); // Asegúrate que el ID sea aResp

  if (id) {
    // EDITAR: Bloqueamos fechas
    document.getElementById("mTitle").innerText = "Editar Actividad";
    inputIni.readOnly = true;
    inputLim.readOnly = true;
    inputIni.style.backgroundColor = "#e9e9e9";
    inputLim.style.backgroundColor = "#e9e9e9";
    // ... cargar el resto de datos
  } else {
    // NUEVA: Habilitamos fechas y limpiamos
    document.getElementById("mTitle").innerText = "Nueva Actividad";
    inputIni.readOnly = false;
    inputLim.readOnly = false;
    inputIni.style.backgroundColor = "#fff";
    inputLim.style.backgroundColor = "#fff";
    // ... limpiar campos
  }
  document.getElementById("modalAct").style.display = "flex";
}
