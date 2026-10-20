const SAMPLE = `
    <h1>Bienvenido a Wysing</h1>
    <p>Un editor <strong>ligero</strong> y <em>enfocado</em> en lo que importa: tu texto. Selecciona cualquier fragmento y usa la barra superior para darle formato.</p>
    <h2>Un lienzo en blanco, sin ruido</h2>
    <p>Puedes escribir títulos, listas, citas, enlaces e imágenes. Todo se guarda automáticamente en este navegador, sin cuentas ni servidores.</p>
    <blockquote>La mejor herramienta es la que desaparece mientras escribes.</blockquote>
    <ul>
        <li>Formato básico: <strong>negrita</strong>, <em>cursiva</em> y <u>subrayado</u>.</li>
        <li>Colores suaves para resaltar sin distraer.</li>
        <li>Descarga tu documento como HTML cuando quieras.</li>
    </ul>
    <p>Empieza a escribir…</p>
`;

const wysing = new Wysing('#app', {
    title: 'Documento sin título',
    content: SAMPLE,
    theme: 'dark',
    placeholder: 'Empieza a escribir…',
    persistence: true,
    storageKey: 'wysing-demo'
});

window.wysing = wysing;
