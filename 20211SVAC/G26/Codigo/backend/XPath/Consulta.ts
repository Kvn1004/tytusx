import { Entorno } from "../AST/Entorno";
import { Simbolo } from "../AST/Simbolo";
import { Tipo } from "../AST/Tipo";
import { Instruccion } from "../Interfaz/instruccion";
import { Atributo } from "../XML/Atributo";
import { Objeto } from "../XML/Objeto";
import { Nodo, TipoAxis, TipoNodo } from "./Nodo";
import { Predicate } from "./Predicate";
import { TipoPrim } from "../Expresiones/Primitiva";

export class Consulta implements Instruccion {
  linea: number;
  columna: number;
  listaNodos: Array<Nodo>;
  constructor(listaNodos: Array<Nodo>, linea: number, columna: number) {
    this.listaNodos = listaNodos;
    this.linea = linea;
    this.columna = columna;
  }

  ToString(): string {
    let cad = "";
    this.listaNodos.forEach((nodo: Nodo) => {
      if (nodo.isFromRoot()) {
        cad += "/" + nodo.getNombre();
      } else {
        cad += "//" + nodo.getNombre();
      }
      if (nodo.isAxis()) {
        cad += "::" + nodo.getValor();
      }
      if (nodo.getPredicado() != undefined) {
        cad += "[" + nodo.getPredicado() + "]";
      }
    });
    return cad;
  }

  ejecutar(global: Entorno): any {
    //Recorrer lista de nodos
    let [salida, _] = this.obtenerSalida(0, global, null, false);
    return salida;
  }

  obtenerSalida(
    pos: number,
    ent: Entorno,
    elemAux: any,
    rompeCiclo: boolean
  ): [String, boolean] {
    let salida = "";
    let actualNode: Nodo = this.listaNodos[pos];
    switch (actualNode.getTipo()) {
      case TipoNodo.IDENTIFIER:
        //Revisar Si tiene predicado este nodo.
        let predicado: Predicate | undefined = actualNode.getPredicado();
        if (predicado != undefined) {
         let auxSal;
          [auxSal, rompeCiclo] = this.obtenerConsultaPredicado(predicado, pos, ent, elemAux, rompeCiclo);
          salida += auxSal;

        } else {
          //Buscar si este id existe en el entorno.
          //Antes de entrar al foreach revisar si se debe hacer para cada elemento  o no.
          for (let i = 0; i < ent.tsimbolos.length; i++) {
            //Ver si este simbolo es igual a actualNode.getNombre()
            let elem = ent.tsimbolos[i].valor;
            if (elem.getNombre() === actualNode.getNombre()) {
              //Si existe este simbolo en el entorno.
              //1. Revisar si es el ultimo nodo a buscar
              if (pos + 1 < this.listaNodos.length) {
                //Aun existen mas nodos en la consulta, ir a buscar eso
                let auxSal;
                [auxSal, rompeCiclo] = this.obtenerSalida(
                  pos + 1,
                  elem.valor,
                  elem,
                  rompeCiclo
                );
                salida += auxSal;
              } else {
                //Es el ultimo nodo en la consulta, escribir su informacion de objeto
                if (elem.getTipo() === Tipo.STRING) {
                  salida += this.concatHijoTexto(elem, 0);
                } else {
                  salida += this.getConsultaObjeto(elem, 0);
                }
              }
            } else if (!actualNode.isFromRoot()) {
              //Este nodo es de tipo //, entonces entrar a buscar de todos modos.
              if (elem.getTipo() === Tipo.ETIQUETA) {
                let auxSal;
                [auxSal, rompeCiclo] = this.obtenerSalida(
                  pos,
                  elem.valor,
                  elem,
                  rompeCiclo
                );
                salida += auxSal;
              }
            }
            if (rompeCiclo) {
              //Salir del ciclo del for.
              break;
            }
          }
        }
        break;
      case TipoNodo.ATRIBUTO:
        //Ver si es @algo o @*
        if (actualNode.getNombre() === "*") {
          //Si es asterisco, obtener todos los atributos del entorno actual
          if (actualNode.isFromRoot()) {
            //Solo es /, buscar solo en el entorno actual todos los atributos.
            ent.tsimbolos.forEach((e: any) => {
              let elem = e.valor;
              if (elem.getTipo() === Tipo.ATRIBUTO) {
                salida += elem.valor + "\n";
              }
            });
          } else {
            //Es //, buscar en el entorno actual y los entornos hijos.
            ent.tsimbolos.forEach((e: any) => {
              let elem = e.valor;
              if (elem.getTipo() === Tipo.ATRIBUTO) {
                salida += elem.valor + "\n";
              } else if (elem.getTipo() === Tipo.STRING) {
                /*
                  FALTAN ETIQUETAS CON TEXTO Y ATRIBUTO EJEMPLO:
                    <title atributorandom="hola"> hola texto </title>
                */
              } else if (elem.getTipo() === Tipo.ETIQUETA) {
                //Ir a buscar atributos al entorno de esta etiqueta
                salida += this.getConsultaAtributos(elem, 0, "*");
              }
            });
          }
        } else {
          //El atributo tiene identificador, buscar solo los atributos que tienen este nombre.
          if (actualNode.isFromRoot()) {
            //Solo es /, buscar solo en el entorno actual todos los atributos.
            ent.tsimbolos.forEach((e: any) => {
              let elem = e.valor;
              if (elem.getTipo() === Tipo.ATRIBUTO) {
                //Concatenar solo si los nombres son iguales.
                if (actualNode.getNombre() === elem.getNombre()) {
                  salida += elem.valor + "\n";
                }
              }
            });
          } else {
            //Es //, buscar en el entorno actual y los entornos hijos.
            ent.tsimbolos.forEach((e: any) => {
              let elem = e.valor;
              if (elem.getTipo() === Tipo.ATRIBUTO) {
                if (actualNode.getNombre() === elem.getNombre()) {
                  salida += elem.valor + "\n";
                }
              } else if (elem.getTipo() === Tipo.STRING) {
                /*
                  FALTAN ETIQUETAS CON TEXTO Y ATRIBUTO EJEMPLO:
                    <title atributorandom="hola"> hola texto </title>
                */
              } else if (elem.getTipo() === Tipo.ETIQUETA) {
                //Ir a buscar atributos al entorno de esta etiqueta
                salida += this.getConsultaAtributos(
                  elem,
                  0,
                  actualNode.getNombre()
                );
              }
            });
          }
        }
        break;
      case TipoNodo.DOTDOT:
        /*
         **
         **  .. (DOTDOT) ESTA BUGGEADO :(
         **
         */
        //Ver si es el ultimo o no
        if (pos + 1 < this.listaNodos.length) {
          //Aun hay mas nodos.
          //Avanzar en la lista de nodos (pos+1) pero regresar al entorno anterior (padre)
          let auxSal;
          [auxSal, rompeCiclo] = this.obtenerSalida(
            pos + 1,
            ent.padre,
            ent.padre.valor,
            rompeCiclo
          );
          salida += auxSal;
          // console.log("SALIDA: ", salida)
        } else {
          //Es el ultimo nodo, entonces obtener consulta sobre este entorno
          let father = ent.padre;
          salida += "<" + father.nombre + " ";
          let atr = true;
          father.tsimbolos.forEach((e: any) => {
            //Para cada simbolo en el entorno anterior, obtener su contenido
            let elem = e.valor;

            if (elem.getTipo() === Tipo.ATRIBUTO) {
              salida += elem.getNombre() + "=" + elem.getValor() + " ";
            } else if (elem.getTipo() === Tipo.ETIQUETA) {
              if (atr) {
                salida += ">\n";
                atr = false;
              }
              salida += this.getConsultaObjeto(elem, 1);
            } else if (elem.getTipo() === Tipo.STRING) {
              if (atr) {
                salida += ">\n";
                atr = false;
              }
              salida += this.concatHijoTexto(elem, 0);
            }
          });
          salida += "</" + father.nombre + ">\n";
        }

        break;
      case TipoNodo.DOT:
        //Ver si es el ultimo o no
        if (pos + 1 < this.listaNodos.length) {
          //Aun hay mas nodos.
          //Avanzar en la lista de nodos (pos+1) pero mantener el mismo entorno
          let auxSal;
          [auxSal, rompeCiclo] = this.obtenerSalida(
            pos + 1,
            ent,
            elemAux,
            rompeCiclo
          );
          salida += auxSal;
        } else {
          //Es el ultimo nodo, entonces obtener consulta sobre este entorno
          if (elemAux.getTipo() === Tipo.STRING) {
            //Esta etiqueta contiene solo texto.
            salida += this.concatHijoTexto(elemAux, 0);
          } else if (elemAux.getTipo() === Tipo.ETIQUETA) {
            salida += this.getConsultaObjeto(elemAux, 0);
          }
        }
        break;
      case TipoNodo.ASTERISCO:
        //* Obtener Todo
        //1. Ver si existen mas nodos
        if (pos + 1 < this.listaNodos.length) {
          //Aun hay mas nodos.
          ent.tsimbolos.forEach((e: any) => {
            if (e.valor.getTipo() === Tipo.ETIQUETA) {
              let auxSal;
              [auxSal, rompeCiclo] = this.obtenerSalida(
                pos + 1,
                e.valor.valor,
                e.valor,
                rompeCiclo
              );
              salida += auxSal;
            }
          });
        } else {
          //Es el ultimo nodo.

          ent.tsimbolos.forEach((e: any) => {
            let elem = e.valor;
            if (elem.getTipo() === Tipo.STRING) {
              salida += this.concatHijoTexto(elem, 0);
            } else if (elem.getTipo() === Tipo.ETIQUETA) {
              salida += this.getConsultaObjeto(elem, 0);
            }
          });
        }
        break;
      case TipoNodo.FUNCION:
        //El nombre de la funcion viene en el valor del nodo. (actualNode.getValor())
        switch (actualNode.getValor().toLocaleLowerCase()) {
          case "text()":
            //Traer solo el texto que tenga adentro el entorno actual
            ent.tsimbolos.forEach((e: any) => {
              let elem = e.valor;
              if (elem.getTipo() === Tipo.STRING) {
                //Es texto, entonces devolver.
                salida += elem.valor;
              }
              //Ver si el nodo es de tipo //
              if (!actualNode.isFromRoot() && elem.getTipo() == Tipo.ETIQUETA) {
                let auxSal;
                [auxSal, rompeCiclo] = this.obtenerSalida(
                  pos,
                  elem.valor,
                  elemAux,
                  rompeCiclo
                );
                salida += auxSal + "\n";
              }
            });
            break;
          case "node()":
            //Todo lo que tenga adentro el nodo en el entorno actual
            console.log(actualNode.getValor());
            ent.tsimbolos.forEach((e: any) => {
              let elem = e.valor;
              if (elem.getTipo() === Tipo.ETIQUETA) {
                salida += this.getConsultaObjeto(elem, 0);
              } else if (elem.getTipo() == Tipo.STRING) {
                salida += elem.valor;
              }
            });
            break;
        }
        break;
      case TipoNodo.AXIS:
        switch (actualNode.getTipoAxis()) {
          case TipoAxis.ANCESTOR:
            /*
             ** 	Selects all ancestors (parent, grandparent, etc.) of the current node
             */
            let nombreParent = actualNode.getValor();
            if (nombreParent != "*") {
              //1. Buscar si existe un entorno padre de este nodo que tenga este nombre.
              let tmpEnt: Entorno = ent.padre;
              while (tmpEnt != null) {
                if (tmpEnt.nombre === nombreParent) {
                  //2. Si existe, obtener consulta a partir de este entorno
                  //0. Ver si existen mas nodos
                  if (pos + 1 < this.listaNodos.length) {
                    //Aun hay mas nodos despues de este, solo cambiar al entorno encontrado.
                    let auxSal;
                    [auxSal, rompeCiclo] = this.obtenerSalida(
                      pos + 1,
                      tmpEnt,
                      elemAux,
                      rompeCiclo
                    );
                    salida += auxSal;
                  } else {
                    salida += this.escribirEtiquetaPadre(tmpEnt);
                  }
                  break;
                }
                tmpEnt = tmpEnt.padre;
              }
            } else {
              //Obtener todos
              let tmpEnt: Entorno = ent.padre;
              while (tmpEnt.padre != null) {
                tmpEnt = tmpEnt.padre;
              }
              if (pos + 1 < this.listaNodos.length) {
                //Aun hay mas nodos despues de este, solo cambiar al entorno encontrado.
                let auxSal;
                [auxSal, rompeCiclo] = this.obtenerSalida(
                  pos + 1,
                  tmpEnt,
                  elemAux,
                  rompeCiclo
                );
                salida += auxSal;
              } else {
                salida += this.escribirEtiquetaPadre(tmpEnt);
              }
            }

            break;
          case TipoAxis.ANCESTORORSELF:
            if (actualNode.getValor() != "*") {
              //1. Buscar si existe un entorno padre de este nodo que tenga este nombre.
              let tmpEnt: Entorno = ent.padre;
              while (tmpEnt != null) {
                if (tmpEnt.nombre === actualNode.getValor()) {
                  //2. Si existe, obtener consulta a partir de este entorno
                  if (pos + 1 < this.listaNodos.length) {
                    //Aun hay mas nodos despues de este, solo cambiar al entorno encontrado.
                    let auxSal;
                    [auxSal, rompeCiclo] = this.obtenerSalida(
                      pos + 1,
                      tmpEnt,
                      elemAux,
                      rompeCiclo
                    );
                    salida += auxSal;
                  } else {
                    salida += this.escribirEtiquetaPadre(tmpEnt);
                  }
                  //3. Obtener consulta tambien a partir del entorno actual
                  salida += this.escribirEtiquetaPadre(tmpEnt);

                  break;
                }
                tmpEnt = tmpEnt.padre;
              }
            } else {
              //Obtener todos
              let tmpEnt: Entorno = ent.padre;
              while (tmpEnt.padre != null) {
                tmpEnt = tmpEnt.padre;
              }
              if (pos + 1 < this.listaNodos.length) {
                //Aun hay mas nodos despues de este, solo cambiar al entorno encontrado.
                let auxSal;
                [auxSal, rompeCiclo] = this.obtenerSalida(
                  pos + 1,
                  tmpEnt,
                  elemAux,
                  rompeCiclo
                );
                salida += auxSal;
              } else {
                salida += this.escribirEtiquetaPadre(tmpEnt);
              }
              //3. Obtener consulta tambien a partir del entorno actual
              salida += this.escribirEtiquetaPadre(tmpEnt);
            }
            break;
          case TipoAxis.ATTRIBUTE:
            // Selects all attributes of the current node
            //1. Sobre el entorno actual, buscar el atributo con el nombre especificado en getValor()
            if (actualNode.getValor() === "*") {
              //Obtener todos los atributos del entorno actual
              ent.tsimbolos.forEach((e: any) => {
                let elem = e.valor;
                if (elem.getTipo() === Tipo.ATRIBUTO) {
                  //0. Si hay mas nodos despues de este, devolver vacio ""
                  if (pos + 1 < this.listaNodos.length) {
                    //Revisar si el siguiente es un nodo comun o un nodo AXIS
                    if (this.listaNodos[pos + 1].getTipo() == TipoNodo.AXIS) {
                      //Es axis, entonces ir a buscar con el entorno actual
                      let auxSal;
                      [auxSal, rompeCiclo] = this.obtenerSalida(
                        pos + 1,
                        ent,
                        elemAux,
                        rompeCiclo
                      );
                      salida += auxSal;
                    } else {
                      //No es axis, entonces devolver consulta vacia
                      salida = "";
                    }
                  } else {
                    //Ya no hay mas nodos, entonces devolver la consulta sobre este entorno.
                    salida += elem.getNombre() + "=" + elem.getValor() + " ";
                  }
                }
                //Ver si el nodo es de tipo //
                if (
                  !actualNode.isFromRoot() &&
                  elem.getTipo() == Tipo.ETIQUETA
                ) {
                  let auxSal;
                  [auxSal, rompeCiclo] = this.obtenerSalida(
                    pos,
                    elem.valor,
                    elemAux,
                    rompeCiclo
                  );
                  salida += auxSal;
                }
              });
            } else {
              //Obtener solo el atributo con el nombre  tiene actualNode.getValor()
              ent.tsimbolos.forEach((e: any) => {
                let elem = e.valor;
                if (elem.getTipo() === Tipo.ATRIBUTO) {
                  if (elem.getNombre() === actualNode.getValor())
                    if (pos + 1 < this.listaNodos.length) {
                      //Revisar si el siguiente es un nodo comun o un nodo AXIS
                      if (this.listaNodos[pos + 1].getTipo() == TipoNodo.AXIS) {
                        //Es axis, entonces ir a buscar con el entorno actual
                        let auxSal;
                        [auxSal, rompeCiclo] = this.obtenerSalida(
                          pos + 1,
                          ent,
                          elemAux,
                          rompeCiclo
                        );
                        salida += auxSal;
                      } else {
                        //No es axis, entonces devolver consulta vacia
                        salida = "";
                      }
                    } else {
                      //Ya no hay mas nodos, entonces devolver la consulta sobre este entorno.
                      salida += elem.getNombre() + "=" + elem.getValor() + " ";
                    }
                }
                //Ver si el nodo es de tipo //
                if (
                  !actualNode.isFromRoot() &&
                  elem.getTipo() == Tipo.ETIQUETA
                ) {
                  let auxSal;
                  [auxSal, rompeCiclo] = this.obtenerSalida(
                    pos,
                    elem.valor,
                    elemAux,
                    rompeCiclo
                  );
                  salida += auxSal;
                }
              });
            }
            break;
          case TipoAxis.CHILD:
            //Selects all children of the current node
            //1. Ver que valor tiene nodeActual.getValor()
            if (actualNode.getValor() === "*") {
              //Traer todos los hijos del contexto actual
              ent.tsimbolos.forEach((e: any) => {
                let elem = e.valor;
                //2. Revisar si es el ultimo nodo o no.
                if (pos + 1 < this.listaNodos.length) {
                  //Aun hay mas nodos, moverme solo de entorno
                  if (elem.getTipo() === Tipo.ETIQUETA) {
                    let auxSal;
                    [auxSal, rompeCiclo] = this.obtenerSalida(
                      pos + 1,
                      elem.valor,
                      elemAux,
                      rompeCiclo
                    );
                    salida += auxSal;
                  }
                } else {
                  //Es el ultimo nodo, obtener la salida
                  if (elem.getTipo() === Tipo.ETIQUETA) {
                    salida += this.getConsultaObjeto(elem, 0);
                  }
                }
                //Ver si el nodo es de tipo //
                if (
                  !actualNode.isFromRoot() &&
                  elem.getTipo() == Tipo.ETIQUETA
                ) {
                  let auxSal;
                  [auxSal, rompeCiclo] = this.obtenerSalida(
                    pos,
                    elem.valor,
                    elemAux,
                    rompeCiclo
                  );
                  salida += auxSal;
                }
              });
            } else {
              //Traer el hijo en el valor
              ent.tsimbolos.forEach((e: any) => {
                let elem = e.valor;
                //2. Revisar si es el ultimo nodo o no.
                if (elem.getNombre() === actualNode.getValor()) {
                  if (pos + 1 < this.listaNodos.length) {
                    //Aun hay mas nodos, moverme solo de entorno
                    if (elem.getTipo() == Tipo.ETIQUETA) {
                      let auxSal;
                      [auxSal, rompeCiclo] = this.obtenerSalida(
                        pos + 1,
                        elem.valor,
                        elemAux,
                        rompeCiclo
                      );
                      salida += auxSal;
                    }
                  } else {
                    //Es el ultimo nodo, obtener la salida
                    if (elem.getTipo() == Tipo.ETIQUETA) {
                      salida += this.getConsultaObjeto(elem, 0);
                    }
                  }
                }
                //Ver si el nodo es de tipo //
                if (
                  !actualNode.isFromRoot() &&
                  elem.getTipo() == Tipo.ETIQUETA
                ) {
                  let auxSal;
                  [auxSal, rompeCiclo] = this.obtenerSalida(
                    pos,
                    elem.valor,
                    elemAux,
                    rompeCiclo
                  );
                  salida += auxSal;
                }
              });
            }
            break;
          case TipoAxis.DESCENDANT:
            //Selects all descendants (children, grandchildren, etc.) of the current node
            //1. Ver que valor tiene nodeActual.getValor()
            if (actualNode.getValor() === "*") {
              //Traer todos los hijos del contexto actual
              ent.tsimbolos.forEach((e: any) => {
                let elem = e.valor;
                //2. Revisar si es el ultimo nodo o no.
                if (pos + 1 < this.listaNodos.length) {
                  //Aun hay mas nodos, moverme solo de entorno
                  if (elem.getTipo() === Tipo.ETIQUETA) {
                    let auxSal;
                    [auxSal, rompeCiclo] = this.obtenerSalida(
                      pos + 1,
                      elem.valor,
                      elemAux,
                      rompeCiclo
                    );
                    salida += auxSal;
                    //Obtener tambien la salida de los hijos que pueda tener este nodo
                    let auxSal2;
                    [auxSal2, rompeCiclo] = this.obtenerHijosRecursivos(
                      pos + 1,
                      elem.valor,
                      elemAux,
                      false,
                      rompeCiclo
                    );
                    salida += auxSal2;
                  }
                } else {
                  //Es el ultimo nodo, obtener la salida
                  if (elem.getTipo() === Tipo.ETIQUETA) {
                    salida += this.getConsultaObjeto(elem, 0);
                    let auxSal;
                    [auxSal, rompeCiclo] = this.obtenerHijosRecursivos(
                      pos + 1,
                      elem.valor,
                      elemAux,
                      true,
                      rompeCiclo
                    );
                    salida += auxSal;
                  }
                }
              });
            } else {
              //Traer el hijo en el valor
              ent.tsimbolos.forEach((e: any) => {
                let elem = e.valor;
                //2. Revisar si es el ultimo nodo o no.
                if (elem.getNombre() === actualNode.getValor()) {
                  if (pos + 1 < this.listaNodos.length) {
                    //Aun hay mas nodos, moverme solo de entorno
                    if (elem.getTipo() == Tipo.ETIQUETA) {
                      let auxSal;
                      [auxSal, rompeCiclo] = this.obtenerSalida(
                        pos + 1,
                        elem.valor,
                        elemAux,
                        rompeCiclo
                      );
                      salida += auxSal;
                    }
                  } else {
                    //Es el ultimo nodo, obtener la salida
                    if (elem.getTipo() == Tipo.ETIQUETA) {
                      salida += this.getConsultaObjeto(elem, 0);
                    }
                  }
                } else {
                  //Si no se llaman igual, pero es etiqueta, entrar a buscar a sus hijos :2
                  if (elem.getTipo() == Tipo.ETIQUETA) {
                    let auxSal;
                    [auxSal, rompeCiclo] = this.obtenerSalida(
                      pos,
                      elem.valor,
                      elemAux,
                      rompeCiclo
                    );
                    salida += auxSal;
                  }
                }
              });
            }
            break;
          case TipoAxis.DESCENDANTORSELF:
            //Selects all descendants (children, grandchildren, etc.) of the current node
            //1. Ver que valor tiene nodeActual.getValor()
            if (actualNode.getValor() === "*") {
              //Traer todos los hijos del contexto actual
              ent.tsimbolos.forEach((e: any) => {
                let elem = e.valor;
                //2. Revisar si es el ultimo nodo o no.
                if (pos + 1 < this.listaNodos.length) {
                  //Aun hay mas nodos, moverme solo de entorno
                  if (elem.getTipo() === Tipo.ETIQUETA) {
                    let auxSal;
                    [auxSal, rompeCiclo] = this.obtenerSalida(
                      pos + 1,
                      elem.valor,
                      elemAux,
                      rompeCiclo
                    );
                    salida += auxSal;
                    //Obtener tambien la salida de los hijos que pueda tener este nodo
                    [auxSal, rompeCiclo] = this.obtenerHijosRecursivos(
                      pos + 1,
                      elem.valor,
                      elemAux,
                      false,
                      rompeCiclo
                    );
                    salida += auxSal;
                  }
                } else {
                  //Es el ultimo nodo, obtener la salida
                  if (elem.getTipo() === Tipo.ETIQUETA) {
                    salida += this.getConsultaObjeto(elem, 0);
                    let auxSal;
                    [auxSal, rompeCiclo] = this.obtenerHijosRecursivos(
                      pos + 1,
                      elem.valor,
                      elemAux,
                      true,
                      rompeCiclo
                    );
                    salida += auxSal;
                  }
                }
              });
            } else {
              //Traer el hijo en el valor
              ent.tsimbolos.forEach((e: any) => {
                let elem = e.valor;
                //2. Revisar si es el ultimo nodo o no.
                if (elem.getNombre() === actualNode.getValor()) {
                  if (pos + 1 < this.listaNodos.length) {
                    //Aun hay mas nodos, moverme solo de entorno
                    if (elem.getTipo() == Tipo.ETIQUETA) {
                      let auxSal;
                      [auxSal, rompeCiclo] = this.obtenerSalida(
                        pos + 1,
                        elem.valor,
                        elemAux,
                        rompeCiclo
                      );
                      salida += auxSal;
                    }
                  } else {
                    //Es el ultimo nodo, obtener la salida
                    if (elem.getTipo() == Tipo.ETIQUETA) {
                      salida += this.getConsultaObjeto(elem, 0);
                    }
                  }
                } else {
                  //Si no se llaman igual, pero es etiqueta, entrar a buscar a sus hijos :2
                  if (elem.getTipo() == Tipo.ETIQUETA) {
                    //Aun hay mas nodos, moverme solo de entorno
                    if (elem.getTipo() == Tipo.ETIQUETA) {
                      let auxSal;
                      [auxSal, rompeCiclo] = this.obtenerSalida(
                        pos,
                        elem.valor,
                        elemAux,
                        rompeCiclo
                      );
                      salida += auxSal;
                    }
                  }
                }
              });
            }
            break;
          case TipoAxis.FOLLOWING:
            //Selects everything in the document after the closing tag of the current node
            //1. Salir del entorno actual, ir al padre.
            let tmpPadre = ent.padre;
            //2. Con el padre buscar a quien se refiere el axis (con getValor())
            //Obtener todos los elementos que estan despues del especificado.
            let found = false; //flag para saber cuando ya se encontro el actual
            let nombreBuscar = ent.nombre;
            while (tmpPadre != null) {
              tmpPadre.tsimbolos.forEach((e: any) => {
                let elem = e.valor;
                if (found) {
                  if (
                    actualNode.getValor() === "*" ||
                    actualNode.getValor() === elem.getNombre()
                  ) {
                    //Ver si es el ultimo nodo o no
                    if (pos + 1 < this.listaNodos.length) {
                      //Aun hay mas nodos, ir con este entorno a buscar
                      let auxSal;
                      [auxSal, rompeCiclo] = this.obtenerSalida(
                        pos + 1,
                        elem.valor,
                        elemAux,
                        rompeCiclo
                      );
                      salida += auxSal;
                    } else {
                      //Escribir elemento
                      if (elem.getTipo() === Tipo.ETIQUETA) {
                        salida += this.getConsultaObjeto(elem, 0);
                      }
                    }
                  }
                }
                if (!found && elem.getNombre() === nombreBuscar) {
                  //Se encontro el entorno actual, ahora si escribir a partir del proximo elemento.
                  found = true;
                }
                //Ver si el nodo es de tipo //
                if (
                  !actualNode.isFromRoot() &&
                  elem.getTipo() == Tipo.ETIQUETA
                ) {
                  let auxSal;
                  [auxSal, rompeCiclo] = this.obtenerSalida(
                    pos,
                    elem.valor,
                    elemAux,
                    rompeCiclo
                  );
                  salida += auxSal;
                }
              });
              nombreBuscar = tmpPadre.nombre;
              tmpPadre = tmpPadre.padre;
              found = false;
            }

            //rompeCiclo = true;
            break;
          case TipoAxis.FOLLOWINGSIBLING:
            //Selects everything in the document after the closing tag of the current node
            //1. Salir del entorno actual, ir al padre.
            let siblingPadre = ent.padre;
            //2. Con el padre buscar a quien se refiere el axis (con getValor())
            if (actualNode.getValor() === "*") {
              //Obtener todos los elementos que estan despues del especificado.
              let found = false; //flag para saber cuando ya se encontro el actual
              let nombreBuscar = ent.nombre;
              siblingPadre.tsimbolos.forEach((e: any) => {
                let elem = e.valor;
                if (found) {
                  //Ver si es el ultimo nodo o no
                  if (pos + 1 < this.listaNodos.length) {
                    //Aun hay mas nodos, ir con este entorno a buscar
                    let auxSal;
                    [auxSal, rompeCiclo] = this.obtenerSalida(
                      pos + 1,
                      elem.valor,
                      elemAux,
                      rompeCiclo
                    );
                    salida += auxSal;
                  } else {
                    //Escribir elemento
                    if (elem.getTipo() === Tipo.ETIQUETA) {
                      salida += this.getConsultaObjeto(elem, 0);
                    }
                  }
                }
                if (!found && elem.getNombre() === nombreBuscar) {
                  //Se encontro el entorno actual, ahora si escribir a partir del proximo elemento.
                  found = true;
                }
                //Ver si el nodo es de tipo //
                if (
                  !actualNode.isFromRoot() &&
                  elem.getTipo() == Tipo.ETIQUETA
                ) {
                  let auxSal;
                  [auxSal, rompeCiclo] = this.obtenerSalida(
                    pos,
                    elem.valor,
                    elemAux,
                    rompeCiclo
                  );
                  salida += auxSal;
                }
              });
            } else {
              //Obtener los elementos que tienen el nombre getValor(), que estan despues de mi entorno actual
              let found = false; //flag para saber cuando ya se encontro el actual
              let nombreBuscar = ent.nombre;
              siblingPadre.tsimbolos.forEach((e: any) => {
                let elem = e.valor;
                if (found) {
                  if (elem.getNombre() === actualNode.getValor()) {
                    //Ver si es el ultimo nodo o no
                    if (pos + 1 < this.listaNodos.length) {
                      //Aun hay mas nodos, ir con este entorno a buscar
                      let auxSal;
                      [auxSal, rompeCiclo] = this.obtenerSalida(
                        pos + 1,
                        elem.valor,
                        elemAux,
                        rompeCiclo
                      );
                      salida += auxSal;
                    } else {
                      //Escribir elemento
                      if (elem.getTipo() === Tipo.ETIQUETA) {
                        salida += this.getConsultaObjeto(elem, 0);
                      }
                    }
                  }
                }
                if (!found && elem.getNombre() === nombreBuscar) {
                  //Se encontro el entorno actual, ahora si escribir a partir del proximo elemento.
                  found = true;
                }
                //Ver si el nodo es de tipo //
                if (
                  !actualNode.isFromRoot() &&
                  elem.getTipo() == Tipo.ETIQUETA
                ) {
                  let auxSal;
                  [auxSal, rompeCiclo] = this.obtenerSalida(
                    pos,
                    elem.valor,
                    elemAux,
                    rompeCiclo
                  );
                  salida += auxSal;
                }
              });
            }
            //rompeCiclo = true;
            break;
          case TipoAxis.NAMESPACE: //No se implementa.
            salida += "";
          case TipoAxis.PARENT:
            //Selects the parent of the current node
            //1. Obtener el padre.
            if (
              actualNode.getValor() === "*" ||
              actualNode.getValor() === ent.padre.nombre
            ) {
              if (pos + 1 < this.listaNodos.length) {
                let auxS;
                [auxS, rompeCiclo] = this.obtenerSalida(
                  pos + 1,
                  ent.padre,
                  elemAux,
                  rompeCiclo
                );
                salida += auxS;
              } else {
                salida += "<" + ent.padre.nombre + " ";
                let atrs = false;
                ent.padre.tsimbolos.forEach((e: any) => {
                  let elem = e.valor;
                  if (elem.getTipo() === Tipo.ATRIBUTO) {
                    salida += elem.getNombre() + "=" + elem.getValor() + " ";
                  } else if (elem.getTipo() === Tipo.ETIQUETA) {
                    if (!atrs) {
                      atrs = true;
                      salida += ">\n";
                    }
                    salida += this.getConsultaObjeto(elem, 1);
                  }
                  //Ver si el nodo es de tipo //
                  if (
                    !actualNode.isFromRoot() &&
                    elem.getTipo() == Tipo.ETIQUETA
                  ) {
                    let auxSal;
                    [auxSal, rompeCiclo] = this.obtenerSalida(
                      pos,
                      elem.valor,
                      elemAux,
                      rompeCiclo
                    );
                    salida += auxSal;
                  }
                });
                salida += "</" + ent.padre.nombre + ">\n";
              }
            }
            break;
          case TipoAxis.PRECEDING || TipoAxis.PRECEDINGSIBLING:
            //Selects all nodes that appear before the
            //current node in the document, except ancestors,
            //attribute nodes and namespace nodes
            //1. Obtener Padre
            let tPadre = ent.padre;
            //2. Recorrer padre y escribir todos los que esten antes del mencionado
            let antes = true;
            tPadre.tsimbolos.forEach((e: any) => {
              let elem = e.valor;
              if (antes && ent.nombre === elem.getNombre()) {
                //Ya se encontro, no escribir mas.
                antes = false;
              }
              if (antes) {
                if (elem.getTipo() == Tipo.ETIQUETA) {
                  if (
                    actualNode.getValor() === "*" ||
                    actualNode.getValor() === elem.getNombre()
                  ) {
                    //Si es asi, escribirlo.
                    if (pos + 1 < this.listaNodos.length) {
                      //Hay mas nodos, solo moverme de entorno y avanzar en la posicion de listaNodos
                      let auxS;
                      [auxS, rompeCiclo] = this.obtenerSalida(
                        pos + 1,
                        elem.valor,
                        elemAux,
                        rompeCiclo
                      );
                      salida += auxS;
                    } else {
                      //Es el ultimo nodo, escribir directamente este elemento.
                      salida += this.getConsultaObjeto(elem, 0);
                    }
                  }
                }
              }
            });
            break;
          case TipoAxis.SELF:
            //Selects the current node
            //Del elemAux, obtener la consulta
            if (
              actualNode.getValor() === "*" ||
              actualNode.getValor() === elemAux.getNombre()
            ) {
              if (pos + 1 < this.listaNodos.length) {
                let auxS;
                [auxS, rompeCiclo] = this.obtenerSalida(
                  pos + 1,
                  ent,
                  elemAux,
                  rompeCiclo
                );
                salida += auxS;
              } else {
                salida += this.getConsultaObjeto(elemAux, 0);
              }
            }
            break;
        }
        break;
      case TipoNodo.NODOERROR:
        if (pos + 1 < this.listaNodos.length) {
          //Ignorar este y moverme hacia el siguiente nodo.
          salida += this.obtenerSalida(pos + 1, ent, elemAux, rompeCiclo);
        } else {
          salida += "";
        }
    }
    return [salida, rompeCiclo];
  }

  encontrarEntorno(padre: Entorno, entBuscar: string): Entorno | null {
    for(let i = 0; i < padre.tsimbolos.length; i++){
      let elem = padre.tsimbolos[i].valor;

      if(elem.getTipo() == Tipo.ETIQUETA && elem.getNombre() == entBuscar){
        return elem.valor;
      }
    }
    return null;
  }

  obtenerConsultaPredicado(predicado: Predicate, pos: number, ent: Entorno, elemAux: any, rompeCiclo: boolean): [String, boolean] {
    let salida = "";
    //0. Obtener entorno sobre quien quiero obtener el predicado.
    let actualNode: Nodo = this.listaNodos[pos];    
    let auxEnt = this.encontrarEntorno(ent, actualNode.getNombre());
    if(auxEnt == null){
      return [salida, rompeCiclo];
    }else{
      ent = auxEnt;
    }
    //1. Obtener el valor del predicado. (Para que se le asigne tipo tambien)
    let predValue = predicado.getValor(ent);
    //2. Obtener el tipo del predicado. 
    console.log("predValue: ",predValue);
    let predTipo = predicado.getTipo();
    switch(predTipo){
      case TipoPrim.INTEGER:
        //Ver si el numero es coherente (mayor a 0);
        if(predValue < 1){
          return [salida, rompeCiclo];
        }
        //Contar las veces que sean necesarias para obtener el nodo requerido
        //Buscar actualNode n veces.
        let veces = 1;
        console.log(ent.nombre);
        ent.tsimbolos.forEach((e: any) => {
          let elem = e.valor;
          
          if(elem.getTipo() === Tipo.ETIQUETA && elem.getNombre() === actualNode.getNombre()){
            if(veces == predValue){
              //Ya, devolver el nodo.
              //Ver si es la ultima posicion o no
              if(pos+ 1 < this.listaNodos.length){
                let auxSal;
                [auxSal, rompeCiclo] = this.obtenerSalida(pos+1, elem.valor, elemAux, rompeCiclo)
                salida += auxSal;
              }else{
                //Es el ultimo, devolver la consulta sobre este entorno.
                salida += this.getConsultaObjeto(elem, 0);
              }
            }
            veces++;
          }
        })
        break;
      case TipoPrim.DOUBLE:
        //Retornar vacio "";
        break;
      
      case TipoPrim.BOOLEAN:
        break;
      
      case TipoPrim.FUNCION:
        //Un TipoPrim.Funcion devuelve un Entorno temporal que contiene
        //Todas las etiquetas a escribir.
        predValue.tsimbolos.forEach((e: any) => {
            let elem = e.valor;
            //Ver si es el ultimo nodo
            if(pos+ 1 < this.listaNodos.length){
              //Aun faltan mas nodos, para cada elemento continuar la consulta con su entorno respectivo
              let auxSal: String = "";

              [auxSal, rompeCiclo] = this.obtenerSalida(pos+1, elem.valor, elemAux, rompeCiclo);
              salida += auxSal;
            }else{
              //Es el ultimo nodo, devolver la consulta sobre este elemento
              salida += this.getConsultaObjeto(elem, 0);
            }
          });
        
        break;
    }
    return [salida, rompeCiclo];

  }


  addTabs(nTabs: number) {
    let tabs = "";
    for (let i = 0; i < nTabs; i++) {
      tabs += "    ";
    }
    return tabs;
  }

  buscarHaciaAdentro(
    elem: any,
    nameEncontrar: string,
    pos: number,
    elemAux: any,
    rompeCiclo: boolean
  ): [string, boolean] {
    let salida = "";

    elem.valor.tsimbolos.forEach((e: any) => {
      let ex = e.valor;
      if (ex.getTipo() === Tipo.ETIQUETA) {
        if (ex.getNombre() == nameEncontrar) {
          if (pos + 1 < this.listaNodos.length) {
            //Aun hay mas nodos ir a buscar sobre este entorno bru.
            let auxSal;
            [auxSal, rompeCiclo] = this.obtenerSalida(
              pos + 1,
              ex.valor,
              elemAux,
              rompeCiclo
            );
            salida += auxSal;
          } else {
            //Escribir este elemento
            salida += this.getConsultaObjeto(ex, 0);
          }
        }
        let auxSal;
        [auxSal, rompeCiclo] = this.buscarHaciaAdentro(
          ex,
          nameEncontrar,
          pos,
          elemAux,
          rompeCiclo
        );
        salida += auxSal;
      }
    });

    return [salida, rompeCiclo];
  }

  obtenerHijosRecursivos(
    pos: number,
    ent: Entorno,
    elemAux: any,
    isLast: boolean,
    rompeCiclo: boolean
  ): [string, boolean] {
    let salida = "";
    ent.tsimbolos.forEach((e: any) => {
      let elem = e.valor;
      if (elem.getTipo() === Tipo.ETIQUETA) {
        if (isLast) {
          salida += this.getConsultaObjeto(elem, 0);
          let auxSal;
          [auxSal, rompeCiclo] = this.obtenerHijosRecursivos(
            pos,
            elem.valor,
            elemAux,
            isLast,
            rompeCiclo
          );
          salida += auxSal;
        } else {
          //Aun hay mas nodos, entonces evaluar sobre eso.
          let auxSal;
          [auxSal, rompeCiclo] = this.obtenerSalida(
            pos,
            elem.valor,
            elemAux,
            rompeCiclo
          );
          salida += auxSal;
        }
      }
    });

    return [salida, rompeCiclo];
  }

  escribirEtiquetaPadre(ent: Entorno): string {
    let salida = "";
    ent.tsimbolos.forEach((e: any) => {
      let elem = e.valor;
      //Escribir a partir de aca
      if (elem.getTipo() == Tipo.ETIQUETA) {
        salida += this.getConsultaObjeto(e.valor, 0);
      }
    });
    return salida;
  }

  getConsultaAtributos(elem: any, nTabs: number, atrBuscar: String): string {
    let salida = "";

    let hijosList = elem.valor.tsimbolos;
    hijosList.forEach((e: any) => {
      let son = e.valor;

      if (son.getTipo() === Tipo.ATRIBUTO) {
        //Es atributo, concatenar a la salida
        if (atrBuscar === "*") {
          salida += son.valor + "\n";
        } else if (atrBuscar === son.getNombre()) {
          salida += son.valor + "\n";
        }
      }
      if (son.getTipo() === Tipo.ETIQUETA) {
        salida += this.getConsultaAtributos(son, nTabs, atrBuscar);
      }
    });

    return salida;
  }

  getConsultaObjeto(elem: any, nTabs: number): string {
    let salida = this.addTabs(nTabs) + "";
    //Obtener todos los que se llaman nombre y sus hijos.
    //1. Para cada elemento escribir su etiqueta, atributos e hijos o texto
    //2 Escribir nombre:
    salida += "<" + elem.nombre;
    let hijosList = elem.valor.tsimbolos;
    //3. Ver si este elemento tiene Atributos
    hijosList.forEach((atr: any) => {
      let atributo = atr.valor;
      //3.1 Ver si el hijo es atributo
      if (atributo.getTipo() === Tipo.ATRIBUTO) {
        //3.2 Concatenar atributo a la salida ejmplo: category="web"
        salida += " " + atributo.nombre + "=" + atributo.valor;
      }
    });
    if (elem.getTipo() === Tipo.ETIQUETA_UNIQUE) {
      salida += "/>\n";
    } else {
      salida += ">\n";
    }
    //4. Ver si el elemento tiene hijos adentro
    hijosList.forEach((h: any) => {
      let hijo = h.valor;
      if (hijo.getTipo() === Tipo.STRING) {
        salida += this.concatHijoTexto(hijo, nTabs + 1);
      } else if (hijo.getTipo() === Tipo.ETIQUETA) {
        //3.3 Escribir la info de este hijo
        salida += this.getConsultaObjeto(hijo, nTabs + 1);
      }
    });

    //2.4 Cerrar la etiqueta actual
    if (elem.getTipo() != Tipo.ETIQUETA_UNIQUE) {
      salida += this.addTabs(nTabs) + "</" + elem.nombre + ">\n";
    }
    return salida;
  }

  concatHijoTexto(son: any, nTabs: number): string {
    let salida = this.addTabs(nTabs) + "";
    salida += "" + son.getValor() + " ";
    return salida + "\n";
  }
}
