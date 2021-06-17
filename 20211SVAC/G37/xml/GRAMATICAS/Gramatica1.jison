


%{
%}
%lex
%options case-insensitive 


escapechar                          [\'\"\\bfnrtv]
escape                              \\{escapechar}
acceptedcharsdouble                 [^\"\\]+
stringdouble                        {escape}|{acceptedcharsdouble}
alfanumerico                       \"{stringdouble}*\"
//strings                            {stringdouble}+

integer [0-9]+
double {integer}"."{integer}
letras [(a-z)|(A-Z)]+
keyboard [\n\r\t ]               // Tabulador, espacios, saltos de linea, retornos de carro -> forman parte del identificador para evitar conflictos, sin embargo deben ser eliminados unicamente cuando venga un nombre de un TAG
identificador  {letras}( [0-9]|(\-|\_)*|{letras} )*{keyboard}*
strings   [^ \n][^<&]+
comments  \<\!\-\-[\s\S\n]*?\-\-\>   //[\s\S\n]*

%%     

//\s+                         /* skip whitespace */
//"print"                     return "print"
//{double}                    return 'Number_Literal'
//{integer}                   return 'Number_Literal'
{comments}                  /* Ignorar comentarios */
{identificador}             return 'Tag_ID'
"&lt;"                      return 'lthan'
"&gt;"                      return 'gthan'
"&amp;"                     return 'amp'
"&apos;"                    return 'apos'
"&quot;"                    return 'quot'
"/"                         return 'F_Slash'
"?"                         return 'qm'
//"("                         return '('
//")"                         return ')'
">"                         return 'GT'
"<"                         return 'LT'
">"                         return 'QM'
"="                         return 'Equal'
{alfanumerico}              return "Alphanumeric"
"\""                        return 'Quote'
{strings}                   return 'strings'

\s+                         /* skip whitespace */

//[a-zA-Z_][a-zA-Z0-9_ñÑ]*    return 'identifier';

//error lexico
.                                   {
                                        console.error('Este es un error léxico: ' + yytext + ', en la linea: ' + yylloc.first_line + ', en la columna: ' + yylloc.first_column);
                                    }


<<EOF>>                     return 'EOF';



/lex

//SECCION DE IMPORTS
%{
    //const {Elemento} = require("../../CLASES/Elemento");
    //const {Atributo} = require("../../CLASES/Atributo");
    //const {nodoCST} = require("../../CLASES/nodoCST");
    var conta = 0 ; // Unica forma de que la etiquetas sean unicas.
%}

// DEFINIMOS PRESEDENCIA DE OPERADORES



%start START

%%  

START: TAGS EOF         { 
        var raiz = new nodoCST('START'+ conta++,'START', []);
            raiz.hijos.push($1.nodoCST);
        $$ = {"elemento":$1.elemento, "nodoCST": raiz};
        return $$; //$$ = $1; /*console.log($1, $2);*/ 
    
    } 
;
   
TAGS: PROLOG TAG               {
        var raiz = new nodoCST('TAGS'+ conta++,'TAGS');
            raiz.hijos.push($1.nodoCST); // TAGS -> PROLOG
            raiz.hijos.push($2.nodoCST); // TAGS -> TAG
        $$ = {"elemento":$2.elemento, "nodoCST": raiz};
        //$$ = $2.elemento; /*console.log($2);*///console.log($1.nodo.crearNodosFormatoDOT());
    } 
;

// PRODUCCION
PROLOG: LT qm Tag_ID Tag_ID Equal Alphanumeric Tag_ID Equal Alphanumeric qm GT {  
    
    var raiz = new nodoCST('PROLOG'+ conta++,'PROLOG');
        raiz.hijos.push(new nodoCST('LT' + conta++, '<'));
        raiz.hijos.push(new nodoCST('qm' + conta++, '?'));
        raiz.hijos.push(new nodoCST('Tag_ID' + conta++, String($3)));
        raiz.hijos.push(new nodoCST('Tag_ID' + conta++, String($4))); 
        raiz.hijos.push(new nodoCST('Equal' + conta++, '='));
        raiz.hijos.push(new nodoCST('Alphanumeric' + conta++, String($6).replace(/"/g,'')));
        raiz.hijos.push(new nodoCST('Tag_ID' + conta++, String($7)));
        raiz.hijos.push(new nodoCST('Equal' + conta++, '='));
        //factorizarString = String($9).replace(/"/g,'');
        raiz.hijos.push(new nodoCST('Alphanumeric' + conta++, String($9).replace(/"/g,'')));
        raiz.hijos.push(new nodoCST('qm' + conta++, String('?')));
        raiz.hijos.push(new nodoCST('GT' + conta++, String('>')));
    

    if(String($4).replace(/\s/g,'') == 'version') 
        if(String($7).replace(/\s/g,'') == 'encoding')
            $$ = {"encoding": $9 , "nodoCST": raiz}; // retornamos el encodigo que requiere
        else $$ = null;  
    else $$ = null;
    
    }
; 
// PRODUCCION
TAG:  LT Tag_ID L_ATRIBUTOS GT  ELEMENTOS   LT F_Slash Tag_ID GT          { 
        var newElemento =  new Elemento(String($2).replace(/\s/g,''), $5.texto, @1.first_line, @1.first_column, $3.atributo, $5.hijos); /*console.log('Tag->',$2,'\n',$5.hijos,'\n <-cerrar');*/
        
        var tag = new nodoCST('TAG'+ conta++, 'TAG');
            tag.hijos.push(new nodoCST('LT' + conta++, '<')); 
            tag.hijos.push(new nodoCST('Tag_ID' + conta++, $2));
            tag.hijos.push($3.nodoCST); 
            tag.hijos.push(new nodoCST('GT' + conta++, '>'));
            tag.hijos.push($5.nodoCST); 
            tag.hijos.push(new nodoCST('LT' + conta++, '<')); 
            tag.hijos.push(new nodoCST('F_Slash' + conta++, '/'));
            tag.hijos.push(new nodoCST('Tag_ID' + conta++, $8));
            tag.hijos.push(new nodoCST('GT' + conta++, '>'));

            $$ = {"elemento":newElemento, "nodoCST": tag};
            
    }
    | LT Tag_ID L_ATRIBUTOS GT              LT F_Slash Tag_ID GT          {
            var newElemento =  new Elemento(String($2).replace(/\s/g,''), $5.texto, @1.first_line, @1.first_column, $3.atributo, []);
            var tag = new nodoCST('TAG'+ conta++, 'TAG');
                tag.hijos.push(new nodoCST('LT' + conta++, '<')); 
                tag.hijos.push(new nodoCST('Tag_ID' + conta++, $2));
                tag.hijos.push($3.nodoCST); 
                tag.hijos.push(new nodoCST('GT' + conta++, '>'));
                tag.hijos.push(new nodoCST('LT' + conta++, '<')); 
                tag.hijos.push(new nodoCST('F_Slash' + conta++, '/'));
                tag.hijos.push(new nodoCST('Tag_ID' + conta++, $7));
                tag.hijos.push(new nodoCST('GT' + conta++, '>'));
                
            $$ = {"elemento":newElemento, "nodoCST": tag};
            
        }
    | LT Tag_ID L_ATRIBUTOS F_Slash GT                                    {
            var newElemento =  new Elemento(String($2).replace(/\s/g,''), $5.texto, @1.first_line, @1.first_column, $3.atributo, []) ;
            var tag = new nodoCST('TAG'+ conta++,'TAG');                   
                tag.hijos.push(new nodoCST('LT' + conta++, '<'));
                tag.hijos.push(new nodoCST('Tag_ID' + conta++, $2));       
                tag.hijos.push($3.nodoCST);
                tag.hijos.push(new nodoCST('F_Slash' + conta++, '/'));     
                tag.hijos.push(new nodoCST('GT' + conta++, '>'));
            $$ = {"elemento":newElemento, "nodoCST": tag};
            
        }
;
// PRODUCCION
ELEMENTOS: ELEMENTOS TAG                { 
                                var raiz = new nodoCST('ELEMENTOS'+ conta++,'ELEMENTOS');
                                //console.log("Que hay  antes? ", $1.nodoCST,'\n\n');
                                    raiz.hijos.push($1.nodoCST); // ELEMENTOS -> ELEMENTOS
                                    raiz.hijos.push($2.nodoCST); // ELEMENTOS -> TAG
                                $1.nodoCST = raiz;  // Actualizamos el valor ya que raiz, contiene lo que $1 tenia anteriormente
                                $1.hijos.push($2.elemento);     
                                $$ = $1;    //  ---> $1 = {texto: $1.val, hijos:[], "nodoCST":raiz };     
                            }
        |  ELEMENTOS strings            {   var elem = new nodoCST('ELEM'+ conta++,'ELEMENTOS');
                                                elem.hijos.push($1.nodoCST); // Almacenamos el hijo adentro del padre
                                                elem.hijos.push(new nodoCST('strings'+ conta++, $2));
                                            $1.nodoCST = elem; // Actualizamos lo que traia antes 
                                            $1.texto += $2; 
                                            $$ = $1; 
                                           // console.log("Que retorno::posible error->",$1);
                                    }
        |  ELEMENTOS PREDEFINIDOS       {   
                                            var elem = new nodoCST('ELEM'+ conta++,'ELEMENTOS');
                                                elem.hijos.push($1.nodoCST); // Almacenamos el hijo adentro del padre
                                                elem.hijos.push($2.nodoCST);
                                            $1.nodoCST = elem; // Actualizamos lo que traia antes 
                                            $1.texto += $2.val; 
                                            $$ = $1; 
                                            //console.log("Que retorno::posible error->",$1);
        }
        |  ELEMENTOS Tag_ID             { 
                            var elem = new nodoCST('ELEM'+ conta++,'ELEMENTOS');
                                elem.hijos.push($1.nodoCST); // Almacenamos el hijo adentro del padre
                                elem.hijos.push(new nodoCST('Tag_ID'+ conta++, $2));
                            $1.nodoCST = elem; // Actualizamos lo que traia antes 
                            $1.texto += ('' + $2); 
                            $$ = $1;      /*console.log('ELEMENTOS Tag_ID ->',$1, $2, '--> ', $1);*/ 
                            //console.log("Que retorno::posible error->",$$);

        }
        |  TAG                          { 
                                var raiz = new nodoCST('ELEMENTOS'+ conta++,'ELEMENTOS');
                                    raiz.hijos.push($1.nodoCST); // ELEMENTOS -> TAG    
                                //$$ = $1;    //  ---> $1 = {texto: $1.val, hijos:[], "nodoCST":raiz }; 
                                $$ = {texto:'', hijos:[$1.elemento], "nodoCST":raiz };      
                                //console.log("Que retorno::posible error->",$$);


                                } 
        |  strings                      {   var elem = new nodoCST('ELEM'+ conta++,'ELEMENTOS');  
                                                elem.hijos.push(new nodoCST('strings'+ conta++, $1)); 
                                            $$ = {texto:String($1), hijos:[], "nodoCST":elem}; /* console.log('strings ->', $1,'END');*/
                                            //console.log("strings->",$$);


                                        }
        |  Tag_ID                       { var elem = new nodoCST('ELEM'+ conta++,'ELEMENTOS'); elem.hijos.push(new nodoCST('Tag_ID'+ conta++, $1)); 
                                          $$ = {texto:String($1), hijos:[], "nodoCST": elem};  /*console.log('Tag_ID ->', $1);*/
                                            //console.log("Que retorno::posible error->",$$);
                                        }
        | PREDEFINIDOS                  { 
                                        var elem = new nodoCST('ELEM'+ conta++,'ELEMENTOS'); 
                                            elem.hijos.push($1.nodoCST); // ELEMENTOS --> PREDEFINIDOS
                                        $$ = {texto: $1.val, hijos:[], "nodoCST":elem }; 
                                        //console.log("Que retorno::posible error->",$$);


        }
;

// PRODUCCION
PREDEFINIDOS: lthan     { var pred = new nodoCST('PREDEFINIDOS'+ conta++,'PREDEFINIDOS'); pred.hijos.push(new nodoCST('lthan'+ conta++,$1)); $$ = {"val":String('<'), "nodoCST":pred}; }
            | gthan     { var pred = new nodoCST('PREDEFINIDOS'+ conta++,'PREDEFINIDOS'); pred.hijos.push(new nodoCST('gthan'+ conta++,$1)); $$ = {"val":String('>'), "nodoCST":pred}; }
            | amp       { var pred = new nodoCST('PREDEFINIDOS'+ conta++,'PREDEFINIDOS'); pred.hijos.push(new nodoCST('amp'+ conta++,$1));   $$ = {"val":String('&'),   "nodoCST":pred  }; }
            | apos      { var pred = new nodoCST('PREDEFINIDOS'+ conta++,'PREDEFINIDOS'); pred.hijos.push(new nodoCST('apos'+ conta++,$1));  $$ = {"val":String("'"),  "nodoCST":pred }; }
            | quot      { var pred = new nodoCST('PREDEFINIDOS'+ conta++,'PREDEFINIDOS'); pred.hijos.push(new nodoCST('quot'+ conta++,$1));  $$ = {"val":String('"'),  "nodoCST":pred }; }
;

L_ATRIBUTOS: ATRIBUTOS      { 
                var raiz = new nodoCST('L_ATRIBUTOS'+ conta++,'L_ATRIBUTOS');
                raiz.hijos.push($1.nodoCST); 
                $$ = {
                    "atributo": $1.atributo,
                    "nodoCST": raiz
                };  //console.log('Que carajo tengo concatenoado\n', $1.nodoCST, '\n\n');
                
            } 
            |  /*Epsilon*/   { 
                var raiz = new nodoCST('L_ATRIBUTOS'+ conta++,'L_ATRIBUTOS'); 
                    raiz.hijos.push(new nodoCST('epsilon'+ conta++,'epsilon-empty'));
                $$ = {  "atributo": [], "nodoCST": raiz}; 
            } 
;            


ATRIBUTOS: ATRIBUTOS ATRIBUTO   { 
            $1.atributo.push($2.atributo); //$$ = $1;
            let raizA2 = new nodoCST('ATRIBUTOS'+ conta++,'ATRIBUTOS');
                raizA2.hijos.push($1.nodoCST); 
                raizA2.hijos.push($2.nodoCST);
            //var uniqueId = 'ATRIBUTOS' + conta++; // id de la produccion padre
            //let newDotString      = uniqueId + '[label = "ATRIBUTOS"] ';   
            //    newDotString      +=  $1.DOTstring+ '\n' + $2.DOTstring + uniqueId + '->' + $1.uniqueId + ';' + uniqueId + '->' + $2.uniqueId + ';';   
            $$ = {
                "atributo": $1.atributo,
                //"uniqueId": uniqueId,
                "nodoCST":raizA2
            };
        }
        | ATRIBUTO              { 
            let raizA = new nodoCST('ATRIBUTOS'+ conta++,'ATRIBUTOS');
                raizA.hijos.push($1.nodoCST);
            $$ = { "atributo": [$1.atributo], "nodoCST": raizA }; 
        } // Creacion del arreglo de atributos
;

ATRIBUTO: Tag_ID Equal Alphanumeric      {
    //$$ = new Atributo(String($1).replace(/\s/g,''), $3, @1.first_line, @1.first_column);
    let raiz2 = new nodoCST('ATRIBUTO'+ conta++,'ATRIBUTO'); // inicializamos raiz de ATRIBUTO
        raiz2.hijos.push(new nodoCST('Tag_ID' + conta++, $1));
        raiz2.hijos.push(new nodoCST('Equal' + conta++ , '='));
        raiz2.hijos.push(new nodoCST('Tag_ID' + conta++, String($3).replace(/"/g,'')));
    $$ = { 
        "atributo" : new Atributo(String($1).replace(/\s/g,''), String($3).replace(/"/g,''), @1.first_line, @1.first_column), 
        "nodoCST": raiz2
    }; 
}
;


