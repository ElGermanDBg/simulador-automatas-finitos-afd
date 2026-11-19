# AFD Studio – Interfaz web

Interfaz web inicial para el repositorio `simulador-automatas-finitos-afd`.

## Ejecutar
1. Descomprime el proyecto.
2. Abre la carpeta `afd_studio` en Visual Studio Code.
3. Abre `index.html` con Live Server, o simplemente haz doble clic sobre `index.html`.

No necesita instalar dependencias para probar esta primera versión.

## Funcionalidades incluidas
- Diseño adaptable a escritorio y móvil.
- Constructor de AFD con estados, alfabeto, estado inicial, estados finales y transiciones.
- Diagrama SVG generado a partir de la definición.
- Representación de la 5-tupla.
- Evaluación de cadenas y recorrido paso a paso.
- Generador de palabras aceptadas en orden canónico.
- Exportación de la definición del autómata a JSON.
- Ejemplo A2 del README (palabras que terminan en `ab`).

## Integración con el backend Python
Esta entrega es una primera interfaz funcional autónoma en el navegador. La evaluación y generación se ejecutan en JavaScript para que puedas probar la experiencia sin cambiar el programa Python original. Para integrarla completamente con el proyecto académico, el siguiente paso es crear una API Flask que invoque la clase `Automata` de `simulador_afd.py` y sustituir las funciones locales `evaluate()` y `generateWords()` por peticiones `fetch()` al backend. Así se conserva una única implementación oficial de la lógica del AFD.
