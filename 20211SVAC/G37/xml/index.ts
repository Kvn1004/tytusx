

//import {Atributo } from '../CLASES/Atributo';
const Gramatica1 = require('./GRAMATICAS/Gramatica1');
const gdesc = require('./GRAMATICAS/gdesc');
import { Ambito} from '../CLASES/Ambito';
import { Elemento } from '../CLASES/Elemento';
import { Errores } from '../CLASES/Errores';
import { nodoCST } from '../CLASES/nodoCST';

console.log("Esta funcionando todo");


function generarTablaErroresHtml(tabla:[Errores]):string{ // Si existe una tabla de errores genera un string de una estructura tipo tabla de un HTML 
    let tHtml:string = "<tr> <th>Tipo de Error</th> <th>Texto erroneo</th> <th>Fila</th> <th>Columna</th> </tr>\n"; // cabecera de la tabla
    tabla.forEach(e => {
      tHtml += `<tr> 
      <td>${e.tipoError}</td>
      <td>${e.texto}</td>
      <td>${e.linea}</td>
      <td>${e.columna}</td>
      </tr>\n`;
    });
  return tHtml;
}


function analizadorDes(){
  //alert("Si estoy funcionando perro");
  const objetos = gdesc.parse(
    `+<!--00
      esto es un comentario
    -->
    <?xml version="1.0" encoding="UTF-8"?>
    <bookstore libreria="Usac" ciudad="Guatemala">
      <book category="children">
      <!--00
      esto es un comentario
    -->
              hola    &amp; mundo
        <title>   !ABC ABC</title>
        <author>!2013 = "abc_123"
        continuacion </author>
        <year>2005</year>
        <price>
            29.99
            <WORK>ABC</WORK>
        </price>
      </book>
      <book2 category="web &amp;">
        <title2>Learning   XML</title2>
        <author2>Erik     T. Ray = ""?</author2>
        <year2>2003</year2>
        <price2>39.95</price2>
      </book2>
    </bookstore>
    `);

    let elementoRaiz:Elemento = <Elemento>objetos['elemento'];//['elemento'];
    const ambitoGlobal:Ambito = elementoRaiz.getTablaSimbolos(null); // construirTablaSimbolos es funcion recursiva
    console.log(ambitoGlobal);
    console.log("Errores encontrados:\n", objetos['errores']);

    //var myTable = document.createElement("table");
    //    myTable.id = 'table_id';
    //    //Add your content to the DIV
    //    myTable.innerHTML = generarTablaErroresHtml(objetos['errores']);
    //    document.body.appendChild(myTable);
    console.log(generarTablaErroresHtml(objetos['errores']));
}


function analizadorAsc(cadena:string):any{

const objetos = Gramatica1.parse(cadena);

  let elementoRaiz:Elemento = <Elemento>objetos['elemento'];//['elemento'];
    const ambitoGlobal:Ambito = elementoRaiz.getTablaSimbolos(null); // construirTablaSimbolos es funcion recursiva
    console.log(ambitoGlobal);
    //console.log("Errores encontrados:\n", objetos['errores']);

  var nodoCSTRaiz: nodoCST = <nodoCST> objetos['nodoCST']
  var DOTCST:string = 'dinetwork {' + nodoCSTRaiz.generarDotString() + '}'; // Genera la estructura tipo DOT para que vis.js pueda graficarla
  //console.log(DOTCST);
  return { "tablaSimb":elementoRaiz, "DOTCST":DOTCST };
}

//analizadorDes();