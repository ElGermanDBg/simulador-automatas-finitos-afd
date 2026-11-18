"""
=============================================================================
                SIMULADOR DE AUTÓMATAS FINITOS DETERMINISTAS (AFD)
=============================================================================
Asignatura: Estructuras Discretas
Descripción:
    Implementación completa desde cero de un Autómata Finito Determinista (AFD).
    Representa formalmente la 5-tupla M = (Q, Σ, δ, q0, F).
    Permite:
        - Módulo 1: Construcción guiada, visualización formal (5-tupla y tabla)
                    y generación del grafo visual con Graphviz.
        - Módulo 2: Búsqueda y listado en orden canónico de hasta 5 palabras
                    reconocidas por el autómata (longitudes de 0 a 10).
        - Módulo 3: Evaluación interactiva paso a paso de cadenas individuales,
                    mostrando el recorrido formal y determinando su aceptación.
=============================================================================
"""

import itertools
import os
import sys

# Importación de la librería Graphviz para la visualización del grafo
try:
    import graphviz
    ExecutableNotFound = graphviz.ExecutableNotFound
except ImportError:
    graphviz = None
    ExecutableNotFound = Exception


# =============================================================================
# 1. ESTRUCTURA DE DATOS: CLASE AUTOMATA
# =============================================================================

class Automata:
    """
    Representa formalmente un Autómata Finito Determinista (AFD)
    definido por la 5-tupla M = (Q, Sigma, delta, q0, F).

    Atributos:
    ----------
    Q : list[str]
        Conjunto finito de estados, almacenados como lista para preservar
        el orden en que fueron ingresados por el usuario.
    Sigma : list[str]
        Alfabeto formal de entrada. Lista de caracteres únicos (strings de longitud 1)
        en el orden canónico ingresado.
    delta : dict[tuple[str, str], str]
        Función de transición δ: Q x Σ -> Q.
        La clave es la tupla (estado_origen, simbolo) y el valor es estado_destino.
    q0 : str
        Estado inicial del autómata (debe pertenecer a Q).
    F : list[str]
        Conjunto de estados finales o de aceptación (subconjunto de Q).
    """

    def __init__(self, Q: list[str], Sigma: list[str], delta: dict[tuple[str, str], str], q0: str, F: list[str]):
        self.Q = list(Q)            # Lista de nombres de estados
        self.Sigma = list(Sigma)    # Lista de símbolos del alfabeto
        self.delta = dict(delta)    # Diccionario de transiciones {(origen, simbolo): destino}
        self.q0 = str(q0)           # Estado inicial
        self.F = list(F)            # Lista de estados de aceptación

    # -------------------------------------------------------------------------
    # 4. FUNCIÓN CENTRAL DE EVALUACIÓN
    # -------------------------------------------------------------------------
    def evaluar_cadena(self, cadena: str) -> dict:
        """
        Evalúa una cadena paso a paso sobre el autómata desde el estado inicial q0.

        Parámetros:
        -----------
        cadena : str
            Cadena de entrada a evaluar (puede ser vacía "").

        Retorna:
        --------
        dict con las siguientes claves:
            - 'valida': bool. True si todos los símbolos pertenecen a Sigma.
            - 'error_simbolo': str o None. Primer símbolo no reconocido (si aplica).
            - 'error_posicion': int o None. Posición 1-indexada del símbolo erróneo.
            - 'recorrido_pasos': list de tuplas (origen, simbolo, destino).
            - 'estado_final': str. Estado en el que culminó la evaluación.
            - 'es_final': bool. True si el estado final pertenece a F.
            - 'aceptada': bool. True si la cadena es completamente válida y termina en F.
            - 'recorrido_str': str. Representación formateada "s0 -a→ s1 -b→ s2".
        """
        # Caso especial: Palabra vacía (longitud 0)
        if cadena == "":
            es_final = self.q0 in self.F
            return {
                'valida': True,
                'error_simbolo': None,
                'error_posicion': None,
                'recorrido_pasos': [],
                'estado_final': self.q0,
                'es_final': es_final,
                'aceptada': es_final,
                'recorrido_str': f"{self.q0}"
            }

        estado_actual = self.q0
        recorrido_pasos = []

        # Recorremos cada símbolo de la cadena paso a paso
        for posicion, simbolo in enumerate(cadena, start=1):
            # Verificación del alfabeto Σ: si un símbolo no pertenece, se detiene
            if simbolo not in self.Sigma:
                return {
                    'valida': False,
                    'error_simbolo': simbolo,
                    'error_posicion': posicion,
                    'recorrido_pasos': recorrido_pasos,
                    'estado_final': estado_actual,
                    'es_final': estado_actual in self.F,
                    'aceptada': False,
                    'recorrido_str': self._formatear_recorrido(recorrido_pasos)
                }

            # Aplicación de la función de transición: δ(estado_actual, simbolo)
            estado_siguiente = self.delta[(estado_actual, simbolo)]
            recorrido_pasos.append((estado_actual, simbolo, estado_siguiente))
            estado_actual = estado_siguiente

        es_final = estado_actual in self.F
        return {
            'valida': True,
            'error_simbolo': None,
            'error_posicion': None,
            'recorrido_pasos': recorrido_pasos,
            'estado_final': estado_actual,
            'es_final': es_final,
            'aceptada': es_final,
            'recorrido_str': self._formatear_recorrido(recorrido_pasos)
        }

    def _formatear_recorrido(self, pasos: list[tuple[str, str, str]]) -> str:
        """
        Construye la representación en texto del recorrido con el formato:
        s0 -a→ s1 -b→ s2
        """
        if not pasos:
            return f"{self.q0}"
        
        texto = pasos[0][0]  # Estado inicial
        for origen, simbolo, destino in pasos:
            texto += f" -{simbolo}→ {destino}"
        return texto

    # -------------------------------------------------------------------------
    # REPRESENTACIÓN FORMAL: 5-TUPLA Y TABLA DE TRANSICIONES
    # -------------------------------------------------------------------------
    def obtener_5_tupla_str(self) -> str:
        """
        Genera la representación formal matemática de la 5-tupla:
        M = (Q, Σ, δ, q0, F)
        """
        q_str = "{" + ", ".join(self.Q) + "}"
        sigma_str = "{" + ", ".join(self.Sigma) + "}"
        f_str = "{" + ", ".join(self.F) + "}" if self.F else "∅"
        return f"M = ({q_str}, {sigma_str}, δ, {self.q0}, {f_str})"

    def mostrar_tabla_transiciones(self):
        """
        Imprime en consola la tabla de transiciones debidamente alineada y con bordes,
        marcando con '→' el estado inicial y con '*' los estados finales.
        Si un estado es tanto inicial como final, se muestra como '→*'.
        """
        # Calcular anchos de columna para una alineación limpia y espaciada
        max_estado_len = max(len(q) for q in self.Q)
        ancho_estado = max(len("Estado"), max_estado_len + 4) + 4  # Margen para '→* ' y espacios

        # Ancho para cada columna de símbolo
        anchos_simbolos = {}
        for s in self.Sigma:
            max_dest_len = max(len(self.delta.get((q, s), "-")) for q in self.Q)
            anchos_simbolos[s] = max(len(s), max_dest_len) + 4

        # Construir línea separadora (+-------+-----+-----+)
        borde_estado = "-" * ancho_estado
        bordes_columnas = [borde_estado] + ["-" * anchos_simbolos[s] for s in self.Sigma]
        linea_separadora = "+" + "+".join(bordes_columnas) + "+"

        print(linea_separadora)
        # Encabezado
        encabezado = f"| {'Estado':<{ancho_estado - 2}} |"
        for s in self.Sigma:
            encabezado += f" {s:^{anchos_simbolos[s] - 2}} |"
        print(encabezado)
        print(linea_separadora)

        # Filas por cada estado
        for q in self.Q:
            # Determinación de los marcadores
            es_inicio = (q == self.q0)
            es_fin = (q in self.F)

            if es_inicio and es_fin:
                marcador = "→* "
            elif es_inicio:
                marcador = "→  "
            elif es_fin:
                marcador = "*  "
            else:
                marcador = "   "

            texto_estado = f"{marcador}{q}"
            fila = f"| {texto_estado:<{ancho_estado - 2}} |"

            for s in self.Sigma:
                dest = self.delta.get((q, s), "-")
                fila += f" {dest:^{anchos_simbolos[s] - 2}} |"
            print(fila)

        print(linea_separadora)
        print("  (Leyenda:  → : Estado inicial  |  * : Estado final de aceptación)\n")

    # -------------------------------------------------------------------------
    # GENERACIÓN DEL GRAFO CON GRAPHVIZ
    # -------------------------------------------------------------------------
    def graficar(self, nombre_archivo: str = "automata_afd", abrir_visor: bool = True) -> str:
        """
        Genera el grafo visual del autómata utilizando graphviz.Digraph:
            - Estados normales: shape='circle'
            - Estados finales: shape='doublecircle'
            - Estado inicial: flecha desde un nodo invisible (shape='point') hacia q0
            - Aristas agrupadas: si varios símbolos van del mismo origen al mismo
              destino, se fusionan en una sola flecha separada por comas (ej. "a, b").

        Retorna la ruta del archivo generado.
        """
        if graphviz is None:
            print("\n[!] La librería 'graphviz' no está instalada en el entorno de Python.")
            print("    Instálela con: pip install graphviz")
            return ""

        # Crear el grafo dirigido con orientación horizontal (de izquierda a derecha)
        dot = graphviz.Digraph(
            name="AFD",
            comment="Autómata Finito Determinista",
            format="png"
        )
        dot.attr(rankdir='LR')

        ids = {q: f"n{i}" for i, q in enumerate(self.Q)}

        # 1. Flecha de inicio (sin etiqueta)
        dot.node('__inicio__', shape='point', style='invis')
        dot.edge('__inicio__', ids[self.q0])

        # 2. Nodos
        for q in self.Q:
            forma = 'doublecircle' if q in self.F else 'circle'
            dot.node(ids[q], label=q, shape=forma)

        # 3. Agrupación de transiciones con mismo origen y destino
        # Diccionario auxiliar: (origen, destino) -> lista de símbolos
        transiciones_agrupadas = {}
        for (origen, simbolo), destino in self.delta.items():
            par = (origen, destino)
            if par not in transiciones_agrupadas:
                transiciones_agrupadas[par] = []
            transiciones_agrupadas[par].append(simbolo)

        # 4. Aristas
        for (origen, destino), simbolos in transiciones_agrupadas.items():
            etiqueta = ", ".join(simbolos)
            dot.edge(ids[origen], ids[destino], label=etiqueta)

        # 5. Guardado del código DOT (.gv) y renderizado a PNG
        archivo_gv = f"{nombre_archivo}.gv"
        try:
            dot.save(archivo_gv)
            print(f"[+] Archivo de definición Graphviz guardado: '{archivo_gv}'")

            # Intentar renderizar la imagen si Graphviz está instalado en el sistema
            archivo_render = dot.render(filename=nombre_archivo, format="png", view=abrir_visor, cleanup=False)
            print(f"[+] Imagen del grafo generada con éxito: '{archivo_render}'")
            return archivo_render
        except ExecutableNotFound:
            print("\n" + "-" * 70)
            print("[i] NOTA SOBRE VISUALIZACIÓN GRÁFICA EN WINDOWS:")
            print(f"    El archivo fuente del grafo '{archivo_gv}' se generó exitosamente.")
            print("    Para abrir la imagen PNG automáticamente, el sistema requiere tener")
            print("    instalado el software Graphviz (https://graphviz.org/download/) en el PATH.")
            print("    Alternativa instantánea sin instalar nada adicional:")
            print(f"    Puedes copiar el contenido de '{archivo_gv}' y pegarlo en:")
            print("    -> https://dreampuf.github.io/GraphvizOnline")
            print("-" * 70)
            return archivo_gv
        except Exception as e:
            print(f"\n[!] Advertencia al renderizar el grafo: {e}")
            return archivo_gv

    # -------------------------------------------------------------------------
    # 5. MÓDULO 2: GENERACIÓN DE PALABRAS EN ORDEN CANÓNICO
    # -------------------------------------------------------------------------
    def generar_palabras_reconocidas(self, max_palabras: int = 5, max_longitud: int = 10) -> list[dict]:
        """
        Genera palabras en orden canónico (longitudes de 0 a 10 y en el orden de Sigma)
        utilizando itertools.product y evalúa cada una hasta encontrar max_palabras
        o agotar la longitud máxima.

        Retorna una lista de diccionarios con la información de cada palabra aceptada.
        """
        palabras_aceptadas = []

        # Si el conjunto de estados finales está vacío, ninguna palabra puede ser aceptada
        if not self.F:
            return palabras_aceptadas

        for longitud in range(0, max_longitud + 1):
            if len(palabras_aceptadas) >= max_palabras:
                break

            # itertools.product respeta el orden canónico de los símbolos en self.Sigma
            for tupla_simbolos in itertools.product(self.Sigma, repeat=longitud):
                palabra = "".join(tupla_simbolos)
                resultado = self.evaluar_cadena(palabra)

                if resultado['aceptada']:
                    palabras_aceptadas.append({
                        'palabra': palabra,
                        'palabra_repr': palabra if palabra != "" else "ε",
                        'recorrido_str': resultado['recorrido_str'],
                        'longitud': longitud
                    })

                    if len(palabras_aceptadas) >= max_palabras:
                        break

        return palabras_aceptadas


# =============================================================================
# 3. MÓDULO 1: CONSTRUCCIÓN Y GRAFICACIÓN
# =============================================================================

def modulo_1_construccion() -> Automata:
    """
    Guía al usuario en la captura y validación paso a paso de los 5 elementos
    del autómata: Q, Sigma, delta, q0, F.

    Garantiza que el programa no se cierre por errores de entrada y genera
    la visualización formal (5-tupla, tabla alineada) y el grafo.
    """
    print("\n" + "=" * 65)
    print("        MÓDULO 1: CONSTRUCCIÓN Y GRÁFICA DEL AFD")
    print("=" * 65)
    print("Por favor, ingrese los 5 componentes formales del autómata:\n")

    # -------------------------------------------------------------------------
    # Paso 1: Conjunto de estados Q
    # -------------------------------------------------------------------------
    while True:
        entrada_q = input("1. Ingrese los estados Q separados por comas (ej. q0, q1, q2): ").strip()
        if not entrada_q:
            print("   [!] Error: Debe ingresar al menos un estado en Q.\n")
            continue

        estados_brutos = [e.strip() for e in entrada_q.split(",") if e.strip()]
        if not estados_brutos:
            print("   [!] Error: No se reconocieron estados válidos. Intente nuevamente.\n")
            continue

        # Validar duplicados manteniendo el orden
        estados_unicos = []
        duplicados = set()
        for e in estados_brutos:
            if e in estados_unicos:
                duplicados.add(e)
            else:
                estados_unicos.append(e)

        if duplicados:
            print(f"   [!] Error: Se detectaron estados repetidos: {sorted(list(duplicados))}.")
            print("       Los nombres de los estados deben ser únicos. Ingrese Q de nuevo.\n")
            continue

        Q = estados_unicos
        print(f"   -> Conjunto Q registrado con éxito: {Q}\n")
        break

    # -------------------------------------------------------------------------
    # Paso 2: Alfabeto Sigma
    # -------------------------------------------------------------------------
    while True:
        entrada_sigma = input("2. Ingrese los símbolos del alfabeto Σ separados por comas (ej. a, b o 0, 1): ").strip()
        if not entrada_sigma:
            print("   [!] Error: Debe ingresar al menos un símbolo en Σ.\n")
            continue

        simbolos_brutos = [s.strip() for s in entrada_sigma.split(",") if s.strip()]
        if not simbolos_brutos:
            print("   [!] Error: No se reconocieron símbolos válidos. Intente nuevamente.\n")
            continue

        # Validar que cada símbolo sea de un único carácter
        simbolos_invalidos = [s for s in simbolos_brutos if len(s) != 1]
        if simbolos_invalidos:
            print(f"   [!] Error: Cada símbolo debe ser de UN SOLO carácter. Inválidos: {simbolos_invalidos}.")
            print("       Intente nuevamente ingresando símbolos de 1 carácter.\n")
            continue

        # Validar duplicados manteniendo el orden
        simbolos_unicos = []
        duplicados_sigma = set()
        for s in simbolos_brutos:
            if s in simbolos_unicos:
                duplicados_sigma.add(s)
            else:
                simbolos_unicos.append(s)

        if duplicados_sigma:
            print(f"   [!] Error: Símbolos duplicados en Σ: {sorted(list(duplicados_sigma))}.")
            print("       Cada símbolo del alfabeto debe ser único. Ingrese Σ de nuevo.\n")
            continue

        Sigma = simbolos_unicos
        print(f"   -> Alfabeto Σ registrado con éxito: {Sigma}\n")
        break

    # -------------------------------------------------------------------------
    # Paso 3: Función de transición delta (|Q| x |Sigma| preguntas)
    # -------------------------------------------------------------------------
    print("3. Definición de la función de transición δ (Q × Σ → Q):")
    print(f"   Se realizarán exactamente {len(Q) * len(Sigma)} preguntas ({len(Q)} estados × {len(Sigma)} símbolos).")
    print("   El estado de destino DEBE pertenecer a Q.\n")

    delta = {}
    for estado in Q:
        for simbolo in Sigma:
            while True:
                destino = input(f"   δ({estado}, '{simbolo}') = ").strip()
                if not destino:
                    print(f"      [!] Error: Ingrese un estado de destino perteneciente a Q = {Q}.")
                    continue
                if destino not in Q:
                    print(f"      [!] Error: El estado '{destino}' NO pertenece a Q = {Q}. Intente nuevamente.")
                    continue
                delta[(estado, simbolo)] = destino
                break
    print("   -> Función de transición δ completada exitosamente.\n")

    # -------------------------------------------------------------------------
    # Paso 4: Estado inicial q0
    # -------------------------------------------------------------------------
    while True:
        entrada_q0 = input(f"4. Ingrese el estado inicial q0 (debe pertenecer a {Q}): ").strip()
        if not entrada_q0:
            print("   [!] Error: El estado inicial no puede estar vacío.\n")
            continue
        if entrada_q0 not in Q:
            print(f"   [!] Error: '{entrada_q0}' no pertenece a Q = {Q}. Intente de nuevo.\n")
            continue
        q0 = entrada_q0
        print(f"   -> Estado inicial q0 asignado: '{q0}'\n")
        break

    # -------------------------------------------------------------------------
    # Paso 5: Conjunto de estados finales F
    # -------------------------------------------------------------------------
    while True:
        entrada_f = input(f"5. Ingrese los estados finales F separados por comas (ENTER si F = ∅): ").strip()
        if not entrada_f:
            F = []
            print("\n   [!] ADVERTENCIA: No se definieron estados finales (F = ∅).")
            print("       El autómata NO reconocerá ninguna palabra.\n")
            break

        estados_f_brutos = [f.strip() for f in entrada_f.split(",") if f.strip()]
        # Validar pertenencia a Q
        no_pertenecen = [f for f in estados_f_brutos if f not in Q]
        if no_pertenecen:
            print(f"   [!] Error: Los estados {no_pertenecen} no pertenecen a Q = {Q}. Intente nuevamente.\n")
            continue

        # Eliminar posibles duplicados dentro de F preservando orden
        F = []
        for f in estados_f_brutos:
            if f not in F:
                F.append(f)
        print(f"   -> Conjunto de estados finales F registrado: {F}\n")
        break

    # Crear instancia del autómata
    automata = Automata(Q=Q, Sigma=Sigma, delta=delta, q0=q0, F=F)

    # -------------------------------------------------------------------------
    # Salidas requeridas del Módulo 1
    # -------------------------------------------------------------------------
    print("\n" + "=" * 65)
    print("                RESULTADOS DE LA CONSTRUCCIÓN")
    print("=" * 65)
    print("1. Definición formal (5-tupla):")
    print(f"   {automata.obtener_5_tupla_str()}\n")

    print("2. Tabla de transiciones del AFD:")
    automata.mostrar_tabla_transiciones()

    print("3. Generación automática del grafo con Graphviz:")
    automata.graficar(nombre_archivo="automata_afd", abrir_visor=True)

    return automata


# =============================================================================
# 5. MÓDULO 2: MOSTRAR CINCO PALABRAS RECONOCIDAS
# =============================================================================

def modulo_2_cinco_palabras(automata: Automata):
    """
    Ejecuta el Módulo 2:
    Genera palabras en orden canónico (longitudes de 0 a 10) usando itertools.product
    sobre Sigma y evalúa cada palabra con la lógica del Módulo 3.
    Muestra hasta 5 palabras aceptadas con su recorrido completo.
    Si encuentra entre 1 y 4 palabras, muestra el mensaje explicativo requerido.
    Si no reconoce ninguna, lo informa claramente.
    """
    print("\n" + "=" * 65)
    print("        MÓDULO 2: CINCO PALABRAS RECONOCIDAS POR EL AFD")
    print("=" * 65)
    print("Generando y evaluando palabras en orden canónico (longitud 0 a 10)...")

    if not automata.F:
        print("\n[!] El autómata no reconoce ninguna palabra (el conjunto F de estados finales está vacío).")
        return

    palabras = automata.generar_palabras_reconocidas(max_palabras=5, max_longitud=10)
    total_encontradas = len(palabras)

    if total_encontradas == 0:
        print("\n[!] El autómata no reconoce ninguna palabra de longitud menor o igual que 10.")
    elif total_encontradas == 5:
        print(f"\n[+] Se encontraron {total_encontradas} palabras reconocidas en orden canónico:\n")
        for idx, item in enumerate(palabras, start=1):
            print(f"   {idx}. Palabra: {item['palabra_repr']}")
            print(f"      Longitud : {item['longitud']}")
            print(f"      Recorrido: {item['recorrido_str']}\n")
    else:
        # Entre 1 y 4 palabras encontradas
        print(f"\n[+] Se encontraron {total_encontradas} palabra(s) reconocida(s):\n")
        for idx, item in enumerate(palabras, start=1):
            print(f"   {idx}. Palabra: {item['palabra_repr']}")
            print(f"      Longitud : {item['longitud']}")
            print(f"      Recorrido: {item['recorrido_str']}\n")
        # Mensaje explicativo estricto solicitado
        print(f"-> Este autómata solo reconoce {total_encontradas} palabras de longitud menor o igual que 10.")


# =============================================================================
# 4. MÓDULO 3: PROBAR SI UNA PALABRA ES RECONOCIDA
# =============================================================================

def modulo_3_probar_palabra(automata: Automata):
    """
    Ejecuta el Módulo 3:
    Permite al usuario ingresar cadenas interactivamente para probarlas en el AFD.
    Muestra el recorrido completo paso a paso (s0 -a→ s1 -b→ s2), el estado final
    alcanzado, si es un estado de aceptación y el veredicto final (SÍ / NO reconocida).
    Maneja la palabra vacía (Enter sin texto) y detiene la evaluación si encuentra
    un símbolo fuera de Sigma indicando su posición.
    Permite probar múltiples palabras consecutivas antes de regresar al menú principal.
    """
    print("\n" + "=" * 65)
    print("        MÓDULO 3: PROBAR PALABRAS EN EL AFD")
    print("=" * 65)
    print("Alfabeto válido Σ:", automata.Sigma)
    print("Estados finales F:", automata.F if automata.F else "∅")
    print("Nota: Si presiona ENTER sin ingresar texto, se evaluará la palabra vacía ε.\n")

    while True:
        cadena = input("Ingrese la palabra a evaluar: ")

        # Indicador visual de palabra vacía
        es_vacia = (cadena == "")
        repr_palabra = "ε (palabra vacía)" if es_vacia else f'"{cadena}"'

        print("\n" + "-" * 50)
        print(f"Evaluando palabra: {repr_palabra}")

        resultado = automata.evaluar_cadena(cadena)

        if not resultado['valida']:
            # Símbolo no reconocido en el alfabeto
            simbolo_fallo = resultado['error_simbolo']
            pos_fallo = resultado['error_posicion']
            print(f"[!] ERROR DE SÍMBOLO:")
            print(f"    El símbolo '{simbolo_fallo}' en la posición {pos_fallo} (1-indexada)")
            print(f"    NO pertenece al alfabeto Σ = {automata.Sigma}.")
            if resultado['recorrido_pasos']:
                print(f"    Recorrido previo a la interrupción: {resultado['recorrido_str']}")
            print(f"    Estado alcanzado antes del error  : {resultado['estado_final']}")
            print("--------------------------------------------------")
            print("Veredicto: La palabra NO es reconocida (contiene símbolos inválidos).")
        else:
            # Cadena con símbolos válidos
            print(f"Recorrido              : {resultado['recorrido_str']}")
            print(f"Estado final alcanzado : {resultado['estado_final']}")
            es_final_str = "SÍ" if resultado['es_final'] else "NO"
            print(f"¿Es estado de aceptación?: {es_final_str} ({resultado['estado_final']} {'∈' if resultado['es_final'] else '∉'} F)")
            print("--------------------------------------------------")
            if resultado['aceptada']:
                print("Veredicto: ¡La palabra SÍ es reconocida por el autómata!")
            else:
                print("Veredicto: La palabra NO es reconocida por el autómata.")

        print("-" * 50)

        # Preguntar si desea probar otra palabra
        while True:
            repetir = input("\n¿Desea probar otra palabra? (S/N): ").strip().upper()
            if repetir in ["S", "SI", "SÍ"]:
                print()
                break
            elif repetir in ["N", "NO"]:
                print("Regresando al Menú Principal...\n")
                return
            else:
                print("Opción inválida. Por favor ingrese 'S' para continuar o 'N' para salir.")


# =============================================================================
# 2. MENÚ PRINCIPAL
# =============================================================================

def main():
    """
    Función principal del simulador.
    Controla el ciclo del menú con las 4 opciones requeridas y valida que
    las opciones 2 y 3 no se ejecuten sin haber construido previamente un autómata.
    """
    automata_en_memoria = None

    while True:
        print("\n" + "=" * 60)
        print("    SIMULADOR DE AUTÓMATAS FINITOS DETERMINISTAS (AFD)")
        print("=" * 60)
        print("  1. Construir el autómata y ver su gráfica (Módulo 1)")
        print("  2. Mostrar cinco palabras reconocidas (Módulo 2)")
        print("  3. Probar si una palabra es reconocida (Módulo 3)")
        print("  4. Salir")
        print("=" * 60)

        opcion = input("Seleccione una opción (1-4): ").strip()

        if opcion == "1":
            # Si ya existía un autómata, se reemplaza por el nuevo
            if automata_en_memoria is not None:
                print("\n[i] Reemplazando el autómata anterior en memoria...")
            automata_en_memoria = modulo_1_construccion()

        elif opcion == "2":
            # Validación: autómata debe existir en memoria
            if automata_en_memoria is None:
                print("\n[!] AVISO: Aún no ha construido un autómata.")
                print("    Por favor, seleccione primero la opción 1 en el menú.")
            else:
                modulo_2_cinco_palabras(automata_en_memoria)

        elif opcion == "3":
            # Validación: autómata debe existir en memoria
            if automata_en_memoria is None:
                print("\n[!] AVISO: Aún no ha construido un autómata.")
                print("    Por favor, seleccione primero la opción 1 en el menú.")
            else:
                modulo_3_probar_palabra(automata_en_memoria)

        elif opcion == "4":
            print("\n¡Gracias por utilizar el Simulador de AFD! Éxitos en su sustentación.")
            sys.exit(0)

        else:
            print("\n[!] Opción no válida. Por favor, ingrese un número del 1 al 4.")


if __name__ == "__main__":
    main()
