# 🏨 Hotel Reservas

Sistema interno de gestión de reservaciones de hotel. Interfaz web con React/TypeScript, backend con Google Apps Script, y datos almacenados en Google Sheets.

## Funcionalidades

- Acceso protegido con contraseña
- Vista semanal de reservaciones (Lunes a Domingo)
- Crear, visualizar y eliminar reservaciones
- Panel de disponibilidad por tipo de habitación
- Notificación por email al crear una nueva reservación
- Reporte automático los jueves (resumen del fin de semana)
- Reporte automático los domingos a las 5PM (resumen de la semana)
- Datos guardados en Google Sheets
- Texto en español, moneda en pesos mexicanos

## Tipos de Habitación

| Tipo | Habitaciones | Precio/Noche |
|------|-------------|-------------|
| 1 Cama Matrimonial | 3 | $900 MXN |
| 1 Cama King Size | 4 | $1,100 MXN |
| 2 Camas Matrimoniales | 10 | $1,500 MXN |
| 2 Camas King Size | 2 | $1,700 MXN |

---

## Guía de Configuración

### Paso 1: Configurar Google Sheets

1. Ve a [Google Sheets](https://sheets.google.com) y crea una nueva hoja de cálculo
2. Copia el **ID de la hoja** desde la URL:
   ```
   https://docs.google.com/spreadsheets/d/ESTE_ES_TU_SHEET_ID/edit
   ```

### Paso 2: Configurar Google Apps Script

1. Ve a [Google Apps Script](https://script.google.com) y crea un nuevo proyecto
2. Abre el archivo `google-apps-script/Code.gs` de este repositorio
3. Copia todo el contenido y pégalo en `Code.gs` del proyecto de Apps Script
4. Actualiza estas variables al inicio del archivo:
   ```javascript
   const SHEET_ID = 'tu-google-sheet-id-aquí';
   const PASSWORD = 'tu-contraseña-aquí';
   ```
5. Despliega como Web App:
   - Click en **Implementar > Nueva implementación**
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Acceso: **Cualquier persona**
   - Click **Implementar**
   - **Copia la URL** de la aplicación web

6. Configura los triggers automáticos:
   - En el editor de Apps Script, ejecuta la función `setupTriggers()` una vez
   - Esto creará los triggers para los reportes de jueves y domingo
   - Autoriza los permisos cuando se soliciten

### Paso 3: Configurar el Frontend

1. Abre `src/api.ts` y reemplaza la URL:
   ```typescript
   const SCRIPT_URL = 'tu-url-de-apps-script-aquí';
   ```

2. Si tu repositorio de GitHub se llama diferente a `hotel-reservas`, actualiza `vite.config.ts`:
   ```typescript
   base: '/nombre-de-tu-repo/',
   ```

### Paso 4: Subir a GitHub y Desplegar

1. Crea un nuevo repositorio en GitHub llamado `hotel-reservas`
2. Sube todos los archivos:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/hotel-reservas.git
   git push -u origin main
   ```
3. En GitHub, ve a **Settings > Pages**:
   - Source: **GitHub Actions**
   - El workflow `.github/workflows/deploy.yml` se ejecutará automáticamente

4. Tu app estará disponible en:
   ```
   https://TU_USUARIO.github.io/hotel-reservas/
   ```

---

## Desarrollo Local

```bash
npm install
npm run dev
```

## Estructura del Proyecto

```
hotel-reservas/
├── .github/workflows/deploy.yml    # GitHub Pages auto-deploy
├── google-apps-script/Code.gs      # Backend completo
├── src/
│   ├── api.ts                      # Capa de comunicación con el backend
│   ├── types.ts                    # Tipos TypeScript y constantes
│   ├── App.tsx                     # Componente principal (Login + Dashboard)
│   ├── index.css                   # Estilos globales
│   ├── main.tsx                    # Entry point de React
│   └── vite-env.d.ts              # Tipos de Vite
├── index.html                      # HTML base
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Reportes por Email

### Reporte de Jueves (9:00 AM)
- Resumen de reservaciones para viernes, sábado y domingo
- Subtotal por día
- Total del fin de semana

### Reporte de Domingo (5:00 PM)
- Resumen de los últimos 7 días
- Desglose por tipo de pago (Tarjeta vs Efectivo vs Pago Faltante)
- Total semanal

### Notificaciones
- Email inmediato a ivannaalorena@gmail.com por cada nueva reservación
