/* =============================================
   CRONOGRAMA UTB v2 — app.js
   Con finanzas, roles y exportación
   ============================================= */

let me = null;
let editId = null;
let editFinId = null;
let pendiente = null;
let filtroAct = 'todas';
let tabActual = 'actividades';
let usuariosCache = []; // Cache de usuarios registrados

// ==================== UTILIDADES ====================
// Primera letra en mayúscula
function capitalizar(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ==================== TABS LOGIN ====================
function switchTab(t) {
  document.querySelectorAll('.auth-tab').forEach((b, i) =>
    b.classList.toggle('active', (i === 0 && t === 'login') || (i === 1 && t === 'reg'))
  );
  document.getElementById('tabLogin').style.display = t === 'login' ? '' : 'none';
  document.getElementById('tabReg').style.display = t === 'reg' ? '' : 'none';
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
  const user = document.getElementById('rUser').value.trim().toLowerCase();
  const cargo = document.getElementById('rCargo').value;
  const pass = document.getElementById('rPass').value;
  const pass2 = document.getElementById('rPass2').value;
  const msg = document.getElementById('rMsg');

  const show = (t, c) => { msg.textContent = t; msg.className = `auth-msg ${c}`; msg.style.display = 'block'; };

  if (!nombre || !user || !cargo || !pass || !pass2) return show('⚠️ Completa todos los campos', 'error');
  if (/\s/.test(user)) return show('⚠️ El usuario no puede tener espacios', 'error');
  if (!/^[a-z0-9]+$/.test(user)) return show('⚠️ Usuario solo letras y números', 'error');
  if (pass.length < 4) return show('⚠️ Contraseña mínimo 4 caracteres', 'error');
  if (pass !== pass2) return show('⚠️ Las contraseñas no coinciden', 'error');

  // El rol se deriva automáticamente del cargo
  const rol = cargo === 'Director Financiero' ? 'director_financiero'
    : cargo === 'Director de Proyecto' ? 'coordinador'
    : 'miembro';

  fetch('/api/usuarios/registrar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, user, cargo, rol, pass })
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
  const msg = document.getElementById('liMsg');

  fetch('/api/usuarios/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, pass })
  })
    .then(r => r.json())
    .then(d => {
      if (d.ok) {
        me = d.usuario;
        document.getElementById('curUser').textContent = capitalizar(me.nombre || me.user);
        document.getElementById('curCargo').textContent = me.cargo || '';
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appScreen').style.display = 'block';
        msg.style.display = 'none';
        
        // Controlar acceso a finanzas según rol
        if (me.rol !== 'director_financiero') {
          document.getElementById('btnNuevaFinanza').style.display = 'none';
        }
        
        // Cargar usuarios para los selects de responsable
        cargarUsuarios().then(() => {
          cargarActividades();
          cargarFinanzas();
        });
      } else {
        msg.textContent = '❌ Usuario o contraseña incorrectos';
        msg.className = 'auth-msg error';
        msg.style.display = 'block';
        document.getElementById('liPass').value = '';
      }
    })
    .catch(() => {
      msg.textContent = '❌ Error de conexión';
      msg.className = 'auth-msg error';
      msg.style.display = 'block';
    });
}

function logout() {
  me = null;
  usuariosCache = [];
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appScreen').style.display = 'none';
  document.getElementById('liUser').value = '';
  document.getElementById('liPass').value = '';
  document.getElementById('liMsg').style.display = 'none';
}

// ==================== CARGAR USUARIOS (para selects) ====================
function cargarUsuarios() {
  return fetch('/api/usuarios/listar')
    .then(r => r.json())
    .then(usuarios => {
      usuariosCache = usuarios;
      // Llenar todos los selects de responsable
      llenarSelectResponsable('aResp');
      llenarSelectResponsable('fResponsable');
    })
    .catch(() => {
      // Si falla, al menos poner el usuario actual
      usuariosCache = [{ nombre: me.nombre, cargo: me.cargo, username: me.user }];
      llenarSelectResponsable('aResp');
      llenarSelectResponsable('fResponsable');
    });
}

function llenarSelectResponsable(selectId, valorActual = '') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Selecciona el responsable --</option>';
  usuariosCache.forEach(u => {
    const opt = document.createElement('option');
    // El value es el cargo, el texto muestra nombre + cargo
    opt.value = u.cargo;
    opt.textContent = `${capitalizar(u.nombre)} — ${u.cargo}`;
    if (valorActual && (u.cargo === valorActual || capitalizar(u.nombre) === valorActual || u.nombre === valorActual)) {
      opt.selected = true;
    }
    sel.appendChild(opt);
  });
}

// ==================== TABS NAVEGACIÓN ====================
function cambiarTab(tab) {
  tabActual = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  
  event.target.classList.add('active');
  document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).style.display = 'block';
  
  if (tab === 'finanzas') cargarFinanzas();
}

// ==================== ESTADO DE ACTIVIDADES ====================
function getEstado(act) {
  if (!act.completada) return 'default';

  const lim = new Date(act.fecha_limite + 'T00:00:00');
  const comp = new Date(act.fecha_completado + 'T00:00:00');
  const diff = Math.round((comp - lim) / 86400000);

  if (diff < -7) return 'prematuro';
  if (diff <= 0) return 'tiempo';
  if (diff <= 7) return 'leve';
  return 'tarde';
}

const ELABEL = {
  default: 'En ejecución',
  prematuro: 'Prematuro 🔵',
  tiempo: 'A tiempo ✅',
  leve: 'Retraso leve',
  tarde: 'Retraso grave'
};
const EBADGE = {
  default: 'b-default', prematuro: 'b-prematuro',
  tiempo: 'b-tiempo', leve: 'b-leve', tarde: 'b-tarde'
};
const EROW = {
  default: 'e-default', prematuro: 'e-prematuro',
  tiempo: 'e-tiempo', leve: 'e-leve', tarde: 'e-tarde'
};
const PRIO = { alta: '🔴 Alta', media: '🟡 Media', baja: '🟢 Baja' };

const ff = f => {
  if (!f) return '-';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
};

// ==================== MODALES ====================
function abrirModalActividad(id = null) {
  editId = id;
  // Refrescar el select de responsable
  llenarSelectResponsable('aResp');

  if (id !== null) {
    fetch(`/api/actividades/${id}`)
      .then(r => r.json())
      .then(a => {
        document.getElementById('mActTitle').textContent = '✏️ Editar Actividad';
        document.getElementById('aNom').value = a.nombre;
        document.getElementById('aDesc').value = a.descripcion || '';
        document.getElementById('aDet').value = a.detalles || '';
        // Seleccionar el responsable en el select por cargo o nombre
        llenarSelectResponsable('aResp', a.responsable);
        document.getElementById('aIni').value = a.fecha_inicio || '';
        document.getElementById('aLim').value = a.fecha_limite || '';
        document.getElementById('aPrio').value = a.prioridad || 'media';
      });
  } else {
    document.getElementById('mActTitle').textContent = '➕ Nueva Actividad';
    ['aNom', 'aDesc', 'aDet', 'aIni', 'aLim'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('aPrio').value = 'media';
    document.getElementById('aResp').value = '';
  }
  document.getElementById('modalAct').classList.add('open');
}

function cerrarModal(idModal) {
  document.getElementById(idModal).classList.remove('open');
  if (idModal === 'modalAct') editId = null;
  if (idModal === 'modalFin') editFinId = null;
}

function guardarActividad() {
  const nombre = document.getElementById('aNom').value.trim();
  const responsable = document.getElementById('aResp').value; // cargo seleccionado
  const fechaInicio = document.getElementById('aIni').value;
  const fechaLimite = document.getElementById('aLim').value;

  if (!nombre || !responsable || !fechaInicio || !fechaLimite) {
    alert('⚠️ Completa todos los campos obligatorios');
    return;
  }

  const payload = {
    nombre,
    descripcion: document.getElementById('aDesc').value,
    detalles: document.getElementById('aDet').value,
    responsable,
    fecha_inicio: fechaInicio,
    fecha_limite: fechaLimite,
    prioridad: document.getElementById('aPrio').value,
    creada_por: me.user
  };

  const url = editId !== null ? `/api/actividades/${editId}` : '/api/actividades';
  const method = editId !== null ? 'PUT' : 'POST';

  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(r => r.json())
    .then(d => {
      if (d.ok) {
        cerrarModal('modalAct');
        cargarActividades();
      } else alert(`❌ ${d.error}`);
    });
}

// ==================== COMPLETAR ACTIVIDAD ====================
function solicitarCompletar(act) {
  // El responsable es el cargo; verificar si el usuario logueado tiene ese cargo
  if (act.responsable !== me.cargo) {
    alert('⚠️ Solo el responsable de la actividad puede marcarla como completada.');
    return;
  }

  pendiente = act.id;
  document.getElementById('confirmTxt').textContent =
    `"${act.nombre}" — Fecha límite: ${ff(act.fecha_limite)}. Ingresa las observaciones de cierre:`;

  // Fecha de hoy fija, no editable
  const hoy = new Date();
  const hoyISO = hoy.toISOString().split('T')[0];
  const [y, m, d] = hoyISO.split('-');
  document.getElementById('fechaCompletado').value = hoyISO;
  document.getElementById('fechaCompletadoDisplay').textContent = `${d}/${m}/${y} (hoy)`;

  document.getElementById('observaciones').value = '';
  document.getElementById('confirmOv').classList.add('open');
}

function confirmarCompletar() {
  const fechaComp = document.getElementById('fechaCompletado').value;
  const obs = document.getElementById('observaciones').value.trim();
  
  if (!fechaComp) {
    alert('⚠️ Selecciona la fecha de completado');
    return;
  }
  if (!obs) {
    alert('⚠️ Las observaciones de cierre son obligatorias');
    return;
  }
  if (pendiente === null) return;

  fetch(`/api/actividades/${pendiente}/completar`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      fecha_completado: fechaComp, 
      observaciones: obs,
      completada_por: me.user 
    })
  })
    .then(r => r.json())
    .then(d => {
      if (d.ok) {
        cerrarConfirm();
        cargarActividades();
      } else alert(`❌ ${d.error}`);
    });
}

function cerrarConfirm() {
  document.getElementById('confirmOv').classList.remove('open');
  pendiente = null;
}

// ==================== VER DETALLES ====================
function verDetalles(id) {
  fetch(`/api/actividades/${id}`)
    .then(r => r.json())
    .then(act => {
      const estado = getEstado(act);
      // Buscar el nombre del usuario con ese cargo para mostrarlo
      const usuResp = usuariosCache.find(u => u.cargo === act.responsable);
      const nombreResp = usuResp ? capitalizar(usuResp.nombre) : act.responsable;

      const html = `
        <div class="detalle-section">
          <h4>📌 ${act.nombre}</h4>
          <p style="color:#666;font-size:.9rem;margin-top:.5rem">${act.descripcion || 'Sin descripción'}</p>
        </div>

        ${act.detalles ? `
        <div class="detalle-section">
          <h4>📄 Detalles</h4>
          <p>${act.detalles}</p>
        </div>` : ''}

        <div class="detalle-grid">
          <div class="detalle-item">
            <strong>👤 Responsable</strong>
            <span>${nombreResp}<br><small style="color:#888">${act.responsable}</small></span>
          </div>
          <div class="detalle-item">
            <strong>🏷️ Prioridad</strong>
            <span>${PRIO[act.prioridad]}</span>
          </div>
          <div class="detalle-item">
            <strong>📅 Fecha Inicio</strong>
            <span>${ff(act.fecha_inicio)}</span>
          </div>
          <div class="detalle-item">
            <strong>⏰ Fecha Límite</strong>
            <span>${ff(act.fecha_limite)}</span>
          </div>
          <div class="detalle-item">
            <strong>📊 Estado</strong>
            <span class="badge ${EBADGE[estado]}">${ELABEL[estado]}</span>
          </div>
          <div class="detalle-item">
            <strong>👤 Creada por</strong>
            <span>${capitalizar(act.creada_por) || '-'}</span>
          </div>
        </div>

        ${act.completada ? `
        <div class="detalle-section" style="background:#e8f5e9;border-left:4px solid #2e7d32">
          <h4>✅ Información de cierre</h4>
          <div class="detalle-grid" style="margin-top:1rem">
            <div class="detalle-item">
              <strong>📅 Completada el</strong>
              <span>${ff(act.fecha_completado)}</span>
            </div>
            <div class="detalle-item">
              <strong>👤 Completada por</strong>
              <span>${capitalizar(act.completada_por) || '-'}</span>
            </div>
          </div>
          ${act.observaciones ? `
          <div style="margin-top:1rem;padding:1rem;background:white;border-radius:8px">
            <strong style="display:block;margin-bottom:.5rem;color:#2e7d32">📝 Observaciones:</strong>
            <p style="color:#555;white-space:pre-wrap">${act.observaciones}</p>
          </div>` : ''}
        </div>` : ''}
      `;
      
      document.getElementById('detalleContent').innerHTML = html;
      document.getElementById('modalDetalle').classList.add('open');
    });
}

// ==================== ELIMINAR ====================
function eliminarActividad(id) {
  if (!confirm('¿Eliminar esta actividad? Esta acción no se puede deshacer.')) return;
  fetch(`/api/actividades/${id}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(d => { if (d.ok) cargarActividades(); });
}

// ==================== FILTRAR ====================
function filtrar(e, btn) {
  filtroAct = e;
  document.querySelectorAll('.fb').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  cargarActividades();
}

// ==================== CARGAR ACTIVIDADES ====================
function cargarActividades() {
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
        cont.innerHTML = '<div class="empty"><div class="ei">📭</div><p>No hay actividades en esta categoría</p></div>';
        return;
      }

      cont.innerHTML = filtradas.map(a => {
        const e = getEstado(a);
        const done = a.completada;
        
        // El responsable ahora es un cargo; verificar si el usuario logueado tiene ese cargo
        const esResponsable = a.responsable === me.cargo;

        // Buscar nombre del responsable en cache
        const usuResp = usuariosCache.find(u => u.cargo === a.responsable);
        const nombreResp = usuResp ? capitalizar(usuResp.nombre) : a.responsable;

        const bComp = done
          ? `<button class="btn-a btn-lock" disabled title="Ya completada">✅</button>`
          : esResponsable
            ? `<button class="btn-a btn-comp" onclick='solicitarCompletar(${JSON.stringify(a)})' title="Completar">✔</button>`
            : `<button class="btn-a btn-lock" disabled title="Solo el responsable puede completarla">🔒</button>`;

        const bEdit = done
          ? `<button class="btn-a btn-lock" disabled title="Bloqueado">🔒</button>`
          : `<button class="btn-a btn-edit" onclick="abrirModalActividad(${a.id})" title="Editar">✏️</button>`;

        const compInfo = done
          ? `<div class="a-meta">✅ Completada el ${ff(a.fecha_completado)} por ${capitalizar(a.completada_por)}</div>`
          : '';

        return `
          <div class="a-row ${EROW[e]}" onclick="verDetalles(${a.id})">
            <div>
              <div class="a-nom ${done ? 'done' : ''}">${a.nombre}</div>
              ${a.descripcion ? `<div class="a-desc">${a.descripcion}</div>` : ''}
              <div class="a-meta">${PRIO[a.prioridad] || ''} · Creada por ${capitalizar(a.creada_por) || '-'}</div>
              ${compInfo}
            </div>
            <div style="font-weight:600;color:#444;font-size:.88rem;">
              ${nombreResp}<br>
              <small style="color:#888;font-weight:400">${a.responsable}</small>
            </div>
            <div style="font-size:.86rem;color:#666;">${ff(a.fecha_inicio)}</div>
            <div style="font-size:.86rem;font-weight:600;">${ff(a.fecha_limite)}</div>
            <div><span class="badge ${EBADGE[e]}">${ELABEL[e]}</span></div>
            <div class="acc" onclick="event.stopPropagation()">
              <button class="btn-a btn-view" onclick="verDetalles(${a.id})" title="Ver detalles">👁️</button>
              ${bComp}
              ${bEdit}
              <button class="btn-a btn-del" onclick="eliminarActividad(${a.id})" title="Eliminar">🗑</button>
            </div>
          </div>`;
      }).join('');
    });
}

// ==================== FINANZAS ====================
function abrirModalFinanza(id = null) {
  editFinId = id;
  // Refrescar select de responsable
  llenarSelectResponsable('fResponsable');

  if (id !== null) {
    fetch(`/api/finanzas`)
      .then(r => r.json())
      .then(finanzas => {
        const fin = finanzas.find(f => f.id === id);
        if (!fin) return;
        
        document.getElementById('mFinTitle').textContent = '✏️ Editar Gasto';
        document.getElementById('fFecha').value = fin.fecha_compra;
        document.getElementById('fConcepto').value = fin.concepto;
        document.getElementById('fCategoria').value = fin.categoria || '';
        document.getElementById('fProveedor').value = fin.proveedor || '';
        document.getElementById('fCantidad').value = fin.cantidad;
        document.getElementById('fValorUnit').value = fin.valor_unitario;
        document.getElementById('fValorTotal').value = `$${fin.valor_total.toLocaleString()}`;
        document.getElementById('fMetodo').value = fin.metodo_pago || '';
        document.getElementById('fFactura').value = fin.factura || '';
        llenarSelectResponsable('fResponsable', fin.responsable);
        document.getElementById('fObs').value = fin.observaciones || '';
      });
  } else {
    document.getElementById('mFinTitle').textContent = '➕ Nuevo Gasto';
    ['fFecha', 'fConcepto', 'fProveedor', 'fValorUnit', 'fFactura', 'fObs'].forEach(id => 
      document.getElementById(id).value = '');
    document.getElementById('fCategoria').value = '';
    document.getElementById('fMetodo').value = '';
    document.getElementById('fCantidad').value = 1;
    document.getElementById('fValorTotal').value = '$0';
    document.getElementById('fResponsable').value = '';
  }
  document.getElementById('modalFin').classList.add('open');
}

function calcularTotalFin() {
  const cant = parseFloat(document.getElementById('fCantidad').value) || 0;
  const unit = parseFloat(document.getElementById('fValorUnit').value) || 0;
  const total = cant * unit;
  document.getElementById('fValorTotal').value = `$${total.toLocaleString('es-CO', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

function guardarFinanza() {
  const fecha = document.getElementById('fFecha').value;
  const concepto = document.getElementById('fConcepto').value.trim();
  const valorUnit = document.getElementById('fValorUnit').value;
  const cantidad = document.getElementById('fCantidad').value;

  if (!fecha || !concepto || !valorUnit) {
    alert('⚠️ Completa los campos obligatorios');
    return;
  }

  const payload = {
    fecha_compra: fecha,
    concepto,
    categoria: document.getElementById('fCategoria').value,
    proveedor: document.getElementById('fProveedor').value,
    cantidad: parseInt(cantidad),
    valor_unitario: parseFloat(valorUnit),
    metodo_pago: document.getElementById('fMetodo').value,
    factura: document.getElementById('fFactura').value,
    responsable: document.getElementById('fResponsable').value,
    observaciones: document.getElementById('fObs').value,
    creado_por: me.user,
    modificado_por: editFinId !== null ? me.user : undefined
  };

  const url = editFinId !== null ? `/api/finanzas/${editFinId}` : '/api/finanzas';
  const method = editFinId !== null ? 'PUT' : 'POST';

  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(r => r.json())
    .then(d => {
      if (d.ok) {
        cerrarModal('modalFin');
        cargarFinanzas();
      } else alert(`❌ ${d.error}`);
    });
}

function eliminarFinanza(id) {
  if (!confirm('¿Eliminar este gasto? Esta acción no se puede deshacer.')) return;
  fetch(`/api/finanzas/${id}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(d => { if (d.ok) cargarFinanzas(); });
}

function cargarFinanzas() {
  fetch('/api/finanzas')
    .then(r => r.json())
    .then(finanzas => {
      const cont = document.getElementById('finList');
      
      // Calcular total
      const total = finanzas.reduce((sum, f) => sum + f.valor_total, 0);
      document.getElementById('finTotal').textContent = 
        `$${total.toLocaleString('es-CO', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

      if (!finanzas.length) {
        cont.innerHTML = '<div class="empty"><div class="ei">💰</div><p>No hay gastos registrados</p></div>';
        return;
      }

      // Solo director financiero puede editar/eliminar
      const esDirectorFin = me.rol === 'director_financiero';

      cont.innerHTML = finanzas.map(f => {
        // Mostrar nombre del responsable si está en cache
        const usuResp = usuariosCache.find(u => u.cargo === f.responsable);
        const nombreResp = usuResp ? capitalizar(usuResp.nombre) : (f.responsable || '-');

        const bEdit = esDirectorFin
          ? `<button class="btn-a btn-edit" onclick="abrirModalFinanza(${f.id})" title="Editar">✏️</button>`
          : `<button class="btn-a btn-lock" disabled title="Solo Director Financiero">🔒</button>`;

        const bDel = esDirectorFin
          ? `<button class="btn-a btn-del" onclick="eliminarFinanza(${f.id})" title="Eliminar">🗑</button>`
          : '';

        return `
          <div class="f-row">
            <div style="font-size:.85rem;color:#666;">${ff(f.fecha_compra)}</div>
            <div style="font-weight:600;color:#333;">${f.concepto}</div>
            <div style="font-size:.82rem;color:#666;">${f.categoria || '-'}</div>
            <div style="font-size:.82rem;color:#666;">${f.proveedor || '-'}</div>
            <div style="text-align:center;font-weight:600;">${f.cantidad}</div>
            <div style="text-align:right;color:#00843D;font-weight:600;">$${f.valor_unitario.toLocaleString()}</div>
            <div style="text-align:right;color:#003B71;font-weight:700;font-size:1rem;">$${f.valor_total.toLocaleString()}</div>
            <div class="acc">
              ${bEdit}
              ${bDel}
            </div>
          </div>`;
      }).join('');
    });
}

// ==================== EXPORTAR EXCEL ====================
function exportarExcel() {
  window.location.href = '/api/exportar/excel';
}

// ==================== CERRAR MODALES AL CLICK FUERA ====================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modalAct').addEventListener('click', e => {
    if (e.target === document.getElementById('modalAct')) cerrarModal('modalAct');
  });
  document.getElementById('modalFin').addEventListener('click', e => {
    if (e.target === document.getElementById('modalFin')) cerrarModal('modalFin');
  });
  document.getElementById('modalDetalle').addEventListener('click', e => {
    if (e.target === document.getElementById('modalDetalle')) cerrarModal('modalDetalle');
  });
  document.getElementById('confirmOv').addEventListener('click', e => {
    if (e.target === document.getElementById('confirmOv')) cerrarConfirm();
  });
});
