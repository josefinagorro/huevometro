# 🥚 Huevómetro

Web chiquita para que la familia anote:

- **Comí**: quién comió huevos, cuántos y qué día.
- **Compré**: cuántos se compraron y qué día.
- **Contar los de la heladera**: compara lo que hay de verdad con lo que debería haber. Si faltan, papá huevo se pone nervioso.
- **Este mes / Actividad**: ranking de comehuevos y movimientos. Para borrar uno, tocá el tachito dos veces.

HTML + CSS + JS puro (sin build), con Supabase como base de datos. Pensado para el celular.

## Probar en tu compu

Si `config.js` está vacío, la app arranca en **modo prueba** y guarda los datos en el navegador.

```bash
npx serve .
# o:  python -m http.server 8000
```

(Abrir `index.html` con doble clic no anda porque usa módulos de JS: hace falta un servidor.)

## 1. Supabase

1. Creá un proyecto en <https://supabase.com> (el plan gratis sobra).
2. Andá a **SQL Editor → New query**, pegá todo `supabase.sql` y dale **Run**. Crea las tablas `compras`, `consumos` y `conteos` con sus permisos.
3. Andá a **Project Settings → API** y copiá:
   - **Project URL**
   - **anon public key**
4. Pegalos en `config.js`.

> La anon key es pública por diseño. La seguridad la dan las políticas de `supabase.sql`. Ojo: con esas políticas, cualquiera que tenga el link de la web puede cargar o borrar datos. Para algo familiar alcanza; no lo publiques por ahí.

## 2. Vercel

**Opción A, con GitHub (recomendada):**
1. Subí esta carpeta a un repo de GitHub.
2. En <https://vercel.com> → **Add New → Project** → elegí el repo.
3. Framework Preset: **Other**. No hace falta build command. **Deploy**.

**Opción B, desde la terminal:**
```bash
npm i -g vercel
vercel        # la primera vez te pregunta cosas: aceptá los valores por defecto
vercel --prod
```

Pasale el link a la familia. En el celu: **Compartir → Agregar a pantalla de inicio** y queda como una app con la cara de papá de ícono 🥚.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | La página |
| `styles.css` | Estilos (mobile first) |
| `app.js` | Lógica: stock, conteos, ranking, Supabase |
| `config.js` | URL y anon key de Supabase |
| `supabase.sql` | Tablas y permisos |
| `img/papa-huevo.png` | Papá huevo 🥚 |
| `img/icono.png` | Ícono de la app |

## Cómo calcula el stock

`stock = compras − consumos`, en orden de fecha. Cada **conteo** reemplaza el stock por el número real contado. Así, si alguien no anotó, la diferencia aparece una sola vez y después se sigue contando desde lo real.
