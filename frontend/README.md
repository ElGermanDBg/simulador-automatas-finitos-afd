# Interfaz Web – Simulador de Autómatas Finitos

Interfaz web sencilla de 3 pestañas (Módulos 1, 2 y 3) conectada al motor oficial en Python (`src/simulador_afd.py`) mediante `src/servidor_web.py`.

## Cómo ejecutar
Desde la raíz del repositorio:

```bash
python src/servidor_web.py
```

Luego abre `http://127.0.0.1:8000` (se abre automáticamente en el navegador).  
*(También se puede abrir `frontend/index.html` directamente en modo local sin conexión al servidor Python).*

## Qué incluye
- **Módulo 1:** arranca vacío, admite cualquier cantidad de estados `Q` y símbolos `|Σ| >= 1`, valida duplicados y longitud de 1 carácter, genera la tabla `|Q| × |Σ|`, permite elegir `q0` y `F` (con advertencia si `F = ∅`) y cargar bajo demanda **A1, A2, A3 o A4**.
- **Gráfica SVG:** agrupa etiquetas (`"a, b"`), dibuja doble círculo para `F`, flecha de inicio, bucles y arcos separados, permite arrastrar los círculos y anima el recorrido paso a paso con números (`1, 2, 3...`, Figura 3).
- **Módulo 2:** muestra automáticamente las 5 palabras reconocidas más cortas (longitud ≤ 10) en orden canónico con su recorrido y los mensajes exactos para menos de 5 palabras o ninguna.
- **Módulo 3:** evalúa cualquier cadena (incluyendo `ε` y reportando símbolos inválidos con su posición), guarda historial y anima el recorrido sobre la gráfica.
- **Exportar / Importar JSON:** guarda y carga definiciones de autómatas en `.json`.
