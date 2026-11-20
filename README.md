# Simulador de Autómatas Finitos Deterministas (AFD)

**Asignatura:** Estructuras Discretas  
**Proyecto:** Simulador de Autómatas Finitos (Módulos 1, 2 y 3 + Mejoras de Bonificación)

---

## 1. Integrantes del Equipo

| Integrante | Usuario de GitHub |
| :--- | :--- |
| **Germán** | [@ElGermanDBg](https://github.com/ElGermanDBg) |
| **Darío** | [@Dario099](https://github.com/Dario099) |

*(Nota: Para consultar cómo mantener el repositorio actualizado entre los integrantes del equipo, revisar el archivo [docs/GUIA_ACTUALIZACIONES_GIT.md](docs/GUIA_ACTUALIZACIONES_GIT.md)).*

---

## 2. Lenguaje, Versión y Herramientas Utilizadas

- **Lenguaje principal:** **Python 3.9 o superior**.
- **Interfaz Web:** **HTML5, CSS3 y JavaScript (SVG)** servida e integrada con Python mediante `src/servidor_web.py` (biblioteca estándar `http.server`).
- **Librería de grafos (modo consola):** `graphviz` (`pip install graphviz`), además del software [Graphviz](https://graphviz.org/download/) instalado en el sistema operativo y agregado al `PATH` para renderizar imágenes `.png`.
- **Restricción cumplida:** **No** se utilizó ninguna librería que implemente autómatas (`automata-lib`, `pyformlang`, etc.). Toda la estructura de datos de la 5-tupla $M = (Q, \Sigma, \delta, q_0, F)$, la función de transición, la evaluación paso a paso y la generación en orden canónico fueron implementadas sin librerías externas de autómatas.

---

## 3. Instrucciones de Instalación y Ejecución

### Paso 1: Clonar o descargar el repositorio
```bash
git clone https://github.com/ElGermanDBg/simulador-automatas-finitos-afd.git
cd simulador-automatas-finitos-afd
```

### Paso 2: Instalar la dependencia de Python
```bash
pip install -r requirements.txt
```
*(Para renderizar automáticamente la gráfica `.png` en el modo consola, instala además [Graphviz](https://graphviz.org/download/) y agrégalo al `PATH` del sistema).*

### Paso 3: Ejecutar el simulador

El proyecto ofrece **dos interfaces** que ejecutan la misma clase `Automata` de `src/simulador_afd.py`:

#### Opción A: Interfaz Web + Motor Python (Recomendada)
```bash
python src/servidor_web.py
```
Abre automáticamente `http://127.0.0.1:8000` en el navegador con:
- **Módulo 1:** Constructor interactivo paso a paso (soporta cualquier cantidad de estados $Q$ y de símbolos $|\Sigma| \ge 1$), validación completa, 5-tupla formal, tabla de transiciones con `→` y `*`, y diagrama SVG con etiquetas agrupadas (`a, b`), doble círculo y flecha de inicio.
- **Módulo 2:** Búsqueda en orden canónico (longitudes `0..10`) con el recorrido de cada palabra y aviso cuando hay menos de 5 palabras o ninguna.
- **Módulo 3:** Evaluador paso a paso con soporte para la palabra vacía `ε`, reporte exacto de símbolos inválidos con su posición e historial de sesión.
- **Mejoras de Bonificación (Sección 9 del enunciado):**
  - Resaltado y animación paso a paso del recorrido sobre la gráfica con numeración (`1, 2, 3...`, Figura 3).
  - Guardar y volver a cargar el autómata en archivo `.json`.

#### Opción B: Simulador en Consola
```bash
python src/simulador_afd.py
```

#### Opción C: Ejecutar pruebas automatizadas (Tablas 1 y 2 del enunciado)
```bash
python tests/test_automata.py
```

---

## 4. Ejemplo de Uso Paso a Paso (Autómata A2 - Sección 4.3 y Sección 7)

El **Autómata A2** reconoce todas las palabras sobre $\Sigma = \{a, b\}$ que **terminan en `ab`**:

### 4.1 Construcción en el Módulo 1
1. **Estados ($Q$):** `s0, s1, s2`
2. **Alfabeto ($\Sigma$):** `a, b`
3. **Función de transición ($\delta$):**
   - $\delta(s0, a) = s1$, $\delta(s0, b) = s0$
   - $\delta(s1, a) = s1$, $\delta(s1, b) = s2$
   - $\delta(s2, a) = s1$, $\delta(s2, b) = s0$
4. **Estado inicial ($q_0$):** `s0`
5. **Estados finales ($F$):** `s2`

```text
M = ({s0, s1, s2}, {a, b}, δ, s0, {s2})

+----------+------+------+
| Estado   |  a   |  b   |
+----------+------+------+
| →  s0    |  s1  |  s0  |
|    s1    |  s1  |  s2  |
| *  s2    |  s1  |  s0  |
+----------+------+------+
```

### 4.2 Cinco palabras reconocidas en el Módulo 2
```text
1. ab     recorrido: s0 -a→ s1 -b→ s2
2. aab    recorrido: s0 -a→ s1 -a→ s1 -b→ s2
3. bab    recorrido: s0 -b→ s0 -a→ s1 -b→ s2
4. aaab   recorrido: s0 -a→ s1 -a→ s1 -a→ s1 -b→ s2
5. abab   recorrido: s0 -a→ s1 -b→ s2 -a→ s1 -b→ s2
```

### 4.3 Prueba de palabras en el Módulo 3
- **`abab`** $\to$ `s0 -a→ s1 -b→ s2 -a→ s1 -b→ s2` $\to$ Termina en `s2 ∈ F` $\to$ **SÍ es reconocida**.
- **`aba`** $\to$ `s0 -a→ s1 -b→ s2 -a→ s1` $\to$ Termina en `s1 ∉ F` $\to$ **NO es reconocida**.
- **`bab`** $\to$ `s0 -b→ s0 -a→ s1 -b→ s2` $\to$ Termina en `s2 ∈ F` $\to$ **SÍ es reconocida**.
- **Palabra vacía $\varepsilon$** $\to$ `s0` $\to$ Termina en `s0 ∉ F` $\to$ **NO es reconocida**.
- **`abc`** $\to$ El símbolo `'c'` (posición 3) no pertenece a $\Sigma = \{a, b\}$ $\to$ **NO es reconocida**.

---

## 5. Capturas de Pantalla (Autómata A2 - Sección 9)

*(Pendiente por agregar por el equipo antes de la entrega final: guardar en `capturas/` las capturas reales de la ejecución de los tres módulos con el autómata A2).*

- `capturas/modulo1_A2.png` — Módulo 1: construcción y gráfica de A2.
- `capturas/modulo2_A2.png` — Módulo 2: 5 palabras reconocidas para A2.
- `capturas/modulo3_A2.png` — Módulo 3: evaluación de palabras y recorrido resaltado en A2.

---

## 6. Estructura del Repositorio

```text
.
├── README.md                       # Documentación principal
├── requirements.txt                # Dependencias de Python (graphviz)
├── src/
│   ├── simulador_afd.py            # Clase Automata y los 3 módulos (consola)
│   └── servidor_web.py             # Servidor HTTP local que conecta frontend/ con Python
├── frontend/                       # Interfaz web simple de 3 pestañas (HTML5, CSS3, JS/SVG)
│   ├── index.html
│   ├── css/styles.css
│   └── js/app.js
├── tests/
│   └── test_automata.py            # Pruebas automatizadas (A1-A4, Tablas 1 y 2, HTTP)
├── capturas/                       # Capturas de los 3 módulos con A2
└── docs/
    └── GUIA_ACTUALIZACIONES_GIT.md # Guía de trabajo colaborativo con Git
```

---

## 7. Referencias y Declaración de Uso de Inteligencia Artificial (Sección 10)

### Referencias técnicas
- Documentación oficial de Python 3 (`itertools.product`, `http.server`, `json`).
- Documentación de Graphviz para Python (`graphviz.Digraph`).

### Declaración de uso de IA
*(Ajusten esta declaración antes de la entrega final si modifican o reescriben módulos por su cuenta).*

Durante el desarrollo se utilizó un asistente de IA para:
- Generar la estructura base de `src/simulador_afd.py`, el puente HTTP `src/servidor_web.py`, la batería de pruebas `tests/test_automata.py`, este `README.md` y la guía de Git.
- Apoyar la corrección e integración de la interfaz web `frontend/` (soporte para alfabetos de cualquier tamaño $|\Sigma| \ge 1$, agrupación de transiciones en el grafo SVG, animación paso a paso de la Figura 3 e importación/exportación JSON).

El equipo revisó, probó y verificó el código frente a todos los casos de las Tablas 1 y 2 del enunciado para poder explicarlo y modificarlo durante la sustentación.
