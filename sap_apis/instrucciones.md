# Instrucciones SOAP - Z_GETDESCRIPCION_MATERIAL

## Alcance
Instrucciones de conexión a distintas API SOAP que se exponen desde el sistema SAP R3. Se especifican las URL's, las credenciales de acceso, que en ningún casos son necesarios porque hay una validación interna de la API, ejemplos de payload y request, así como la información relevante en la request de cada API. Cada servicio se enumera en este documento como ## ServicioXX (ejemplo Servicio01, Servicio02, ...)

## Servicio01
Integración SOAP para obtener la descripción de material a partir de una orden de fabricación. La validación es interna, por lo que no se requiere usuario ni contraseña.

- **Nombre funcional:** Devolver descripción del material a partir de una orden de fabricación.
- **Operación SOAP:** `Z_GETDESCRIPCION_MATERIAL`
- **Endpoint:** `http://192.168.10.202:8000/sap/bc/srt/rfc/sap/z_claude_code_01/700/z_claude_code_01/z_claude_code_01_bin?sap-language=ES`
- **SOAPAction:** No aplica.
- **Autenticación:** No aplica; validación interna.

## Contrato de entrada
### Request
| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `I_OF` | `string` | Sí | Orden de fabricación. |

### Ejemplo de request
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:sap-com:document:sap:rfc:functions">
   <soapenv:Header/>
   <soapenv:Body>
      <urn:Z_GETDESCRIPCION_MATERIAL>
         <I_OF>8746853</I_OF>
      </urn:Z_GETDESCRIPCION_MATERIAL>
   </soapenv:Body>
</soapenv:Envelope>
```

## Contrato de salida
### Response técnico
| Parámetro | Tipo | Descripción |
|---|---|---|
| `E_CONFIGURABLE` | `string` | Indicador de material configurable. Vacío cuando no aplica; valor `X` cuando el material es configurable. |
| `E_DESCRIPCION` | `string` | Descripción del material. |
| `E_OF` | `string` | Orden de fabricación devuelta por el servicio. |
| `E_PEDIDO` | `string` | Pedido asociado, si existe. |
| `E_POSICION_PED` | `string` | Posición del pedido asociada. |
| `E_CONFIGURACION` | `array` de objetos | Lista de características de configuración cuando `E_CONFIGURABLE = X`. |

### Campos relevantes para consumo
#### Caso 1: `E_CONFIGURABLE = ''`
En este caso solo interesa el siguiente campo del response:

| Campo | Tipo | Uso |
|---|---|---|
| `E_DESCRIPCION` | `string` | Descripción del material. |

#### Caso 2: `E_CONFIGURABLE = 'X'`
En este caso interesan los siguientes datos del response:

| Campo | Tipo | Uso |
|---|---|---|
| `E_DESCRIPCION` | `string` | Descripción principal del material. |
| `E_CONFIGURACION[].ATBEZ` | `string` | Descripción de la característica. |
| `E_CONFIGURACION[].ATWTB` | `string` | Valor descriptivo de la característica. |

### Estructura técnica de `E_CONFIGURACION`
| Campo | Tipo | Descripción |
|---|---|---|
| `ATINN` | `string` | Identificador interno de característica. |
| `ATNAM` | `string` | Nombre técnico de la característica. |
| `ATBEZ` | `string` | Descripción de la característica. |
| `ATWRT` | `string` | Valor técnico de la característica. |
| `ATWTB` | `string` | Texto descriptivo del valor. |
| `EWAHR` | `string` | Probabilidad o indicador asociado al valor. |

## Comportamiento funcional
- Si `E_CONFIGURABLE` viene vacío, para el consumo funcional solo debe utilizarse `E_DESCRIPCION`.
- Si `E_CONFIGURABLE = X`, para el consumo funcional deben utilizarse `E_DESCRIPCION` y, dentro de cada `item` de `E_CONFIGURACION`, los campos `ATBEZ` y `ATWTB`.
- `E_CONFIGURACION` puede contener múltiples elementos `item`.
- El resto de campos del response pueden conservarse como parte del contrato técnico, pero no son necesarios para el consumo funcional actual.
- Los campos vacíos en XML representan valores no informados.

## Ejemplo de response sin configuración
```xml
<soap-env:Envelope xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/">
   <soap-env:Header/>
   <soap-env:Body>
      <n0:Z_GETDESCRIPCION_MATERIALResponse xmlns:n0="urn:sap-com:document:sap:rfc:functions">
         <E_CONFIGURABLE/>
         <E_CONFIGURACION/>
         <E_DESCRIPCION>BASALTO BCO 80X140 G. INOX AVEC BONDE</E_DESCRIPCION>
         <E_OF>8746853</E_OF>
         <E_PEDIDO/>
         <E_POSICION_PED>000000</E_POSICION_PED>
      </n0:Z_GETDESCRIPCION_MATERIALResponse>
   </soap-env:Body>
</soap-env:Envelope>
```

## Ejemplo de response con configuración
```xml
<soap-env:Envelope xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/">
   <soap-env:Header/>
   <soap-env:Body>
      <n0:Z_GETDESCRIPCION_MATERIALResponse xmlns:n0="urn:sap-com:document:sap:rfc:functions">
         <E_CONFIGURABLE>X</E_CONFIGURABLE>
         <E_CONFIGURACION>
            <item>
               <ATINN>0000005318</ATINN>
               <ATNAM>SEMICIRCULAR</ATNAM>
               <ATBEZ>Half Quad</ATBEZ>
               <ATWRT>0</ATWRT>
               <ATWTB>No</ATWTB>
               <EWAHR>0</EWAHR>
            </item>
            <item>
               <ATINN>0000004625</ATINN>
               <ATNAM>RAL_PLATO_FUNCION</ATNAM>
               <ATBEZ>RAL_PLATO_FUNCION</ATBEZ>
               <ATWRT>0</ATWRT>
               <ATWTB>0</ATWTB>
               <EWAHR>0</EWAHR>
            </item>
         </E_CONFIGURACION>
         <E_DESCRIPCION>PLATO PIZARRA</E_DESCRIPCION>
         <E_OF>2835060</E_OF>
         <E_PEDIDO>0020992255</E_PEDIDO>
         <E_POSICION_PED>000010</E_POSICION_PED>
      </n0:Z_GETDESCRIPCION_MATERIALResponse>
   </soap-env:Body>
</soap-env:Envelope>
```

## Implementación en el proyecto

- **Server function:** `src/lib/sap.functions.ts` → `buscarOfSap({ data: { numeroOf } })`
- **Tipo de retorno:** `SapOfData { of, descripcion, configurable, configuracion: [{atbez, atwtb}] }`
- **Integración:** `src/routes/_authenticated/picar-of.tsx` — se llama en paralelo con `buscarOf` al pulsar "Buscar OF". El resultado se muestra en la tarjeta de info de la OF (step "molde").
- **Parsing:** regex sobre el XML de respuesta (sin dependencias externas).

### Reglas de visualización en pantalla

| `E_CONFIGURABLE` | Mostrar en cabecera OF | Mostrar tarjeta SAP |
|---|---|---|
| `''` (vacío) | Solo OF | Sí — solo `E_DESCRIPCION` |
| `X` | OF, Modelo, Medida y Color | Sí — `E_DESCRIPCION` + lista `ATBEZ` / `ATWTB` |

Cuando `E_CONFIGURABLE = ''`, las etiquetas **Modelo**, **Medida** y **Color** se ocultan de la cabecera porque la descripción completa del material ya viene en la tarjeta SAP.

## Observaciones
- La estructura de `E_CONFIGURACION` es repetitiva y debe tratarse como colección.
- Para el consumo funcional actual, solo deben mapearse los campos indicados en la sección "Campos relevantes para consumo".
- El servicio admite una sola entrada: `I_OF`.
- Conviene documentar valores obligatorios/longitudes si en el futuro se recibe el WSDL oficial.
- Si se añaden más APIs, mantener el mismo patrón: endpoint, request, response, comportamiento y ejemplos.