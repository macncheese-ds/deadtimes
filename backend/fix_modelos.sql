-- Script para actualizar los nombres de modelos eliminando "Top" y "Bot" del final
-- Ya que el sistema concatena automáticamente el lado

-- Línea 1
UPDATE modelos SET modelo = 'FCM30 A' WHERE modelo = 'FCM30 A Bot' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 A' WHERE modelo = 'FCM30 A Top' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 B' WHERE modelo = 'FCM30 B Bot' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 B' WHERE modelo = 'FCM30 B Top' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 C' WHERE modelo = 'FCM30 C Bot' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 C' WHERE modelo = 'FCM30 C Top' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 D' WHERE modelo = 'FCM30 D Bot' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 D' WHERE modelo = 'FCM30 D Top' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 E' WHERE modelo = 'FCM30 E Bot' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 E' WHERE modelo = 'FCM30 E Top' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 F' WHERE modelo = 'FCM30 F Bot' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 F' WHERE modelo = 'FCM30 F Top' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 G' WHERE modelo = 'FCM30 G Bot' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 G' WHERE modelo = 'FCM30 G Top' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 H' WHERE modelo = 'FCM30 H Bot' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 H' WHERE modelo = 'FCM30 H Top' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 I' WHERE modelo = 'FCM30 I Bot' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 I' WHERE modelo = 'FCM30 I Top' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 J' WHERE modelo = 'FCM30 J Bot' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 J' WHERE modelo = 'FCM30 J Top' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 K' WHERE modelo = 'FCM30 K Top' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 L' WHERE modelo = 'FCM30 L Bot' AND linea = 1;
UPDATE modelos SET modelo = 'FCM30 L' WHERE modelo = 'FCM30 L Top' AND linea = 1;
UPDATE modelos SET modelo = 'MRR35' WHERE modelo = 'MRR35 Bottom' AND linea = 1;
UPDATE modelos SET modelo = 'MRR35' WHERE modelo = 'MRR35 Top' AND linea = 1;

-- Línea 2
UPDATE modelos SET modelo = 'IDB MAIN B variant' WHERE modelo = 'IDB MAIN B variant Bot' AND linea = 2;
UPDATE modelos SET modelo = 'IDB MAIN B variant' WHERE modelo = 'IDB MAIN B variant Top' AND linea = 2;
UPDATE modelos SET modelo = 'IDB MAIN F variant' WHERE modelo = 'IDB MAIN F variant Bot' AND linea = 2;
UPDATE modelos SET modelo = 'IDB MAIN F variant' WHERE modelo = 'IDB MAIN F variant Top' AND linea = 2;
UPDATE modelos SET modelo = 'IDB MAIN H variant' WHERE modelo = 'IDB MAIN H variant Bot' AND linea = 2;
UPDATE modelos SET modelo = 'IDB MAIN H variant' WHERE modelo = 'IDB MAIN H variant Top' AND linea = 2;
UPDATE modelos SET modelo = 'IDB MAIN L variant' WHERE modelo = 'IDB MAIN L variant Bot' AND linea = 2;
UPDATE modelos SET modelo = 'IDB MAIN L variant' WHERE modelo = 'IDB MAIN L variant Top' AND linea = 2;
UPDATE modelos SET modelo = 'IDB MAIN N variant' WHERE modelo = 'IDB MAIN N variant Bot' AND linea = 2;
UPDATE modelos SET modelo = 'IPTS N-M F variant' WHERE modelo = 'IPTS N-M F variant BOT' AND linea = 2;
UPDATE modelos SET modelo = 'IPTS N-M F variant' WHERE modelo = 'IPTS N-M F variant TOP' AND linea = 2;
UPDATE modelos SET modelo = 'IPTS N-M variant' WHERE modelo = 'IPTS N-M variant BOT' AND linea = 2;
UPDATE modelos SET modelo = 'IPTS N-M variant' WHERE modelo = 'IPTS N-M variant TOP' AND linea = 2;
UPDATE modelos SET modelo = 'MGH ESC A var' WHERE modelo = 'MGH ESC A var_BOT' AND linea = 2;
UPDATE modelos SET modelo = 'MGH ESC A var' WHERE modelo = 'MGH ESC A var_TOP' AND linea = 2;
UPDATE modelos SET modelo = 'MGH ESC AF var' WHERE modelo = 'MGH ESC AF var BOT' AND linea = 2;
UPDATE modelos SET modelo = 'MGH ESC AF var' WHERE modelo = 'MGH ESC AF var TOP' AND linea = 2;
UPDATE modelos SET modelo = 'MGH ESC AG var' WHERE modelo = 'MGH ESC AG var BOT' AND linea = 2;
UPDATE modelos SET modelo = 'MGH ESC AG var' WHERE modelo = 'MGH ESC AG var TOP' AND linea = 2;
UPDATE modelos SET modelo = 'MGH MOCI Base B var' WHERE modelo = 'MGH MOCI Base B var_BOT' AND linea = 2;
UPDATE modelos SET modelo = 'MGH MOCI Prime C var' WHERE modelo = 'MGH MOCI Prime C var_BOT' AND linea = 2;
UPDATE modelos SET modelo = 'MGH MOCI Base B var' WHERE modelo = 'MGH MOCI Base B var_TOP' AND linea = 2;
UPDATE modelos SET modelo = 'MGH MOCI Prime 1P D var' WHERE modelo = 'MGH MOCI Prime 1P D var_BOT' AND linea = 2;
UPDATE modelos SET modelo = 'MGH MOCI Prime 1P D var' WHERE modelo = 'MGH MOCI Prime 1P D var_TOP' AND linea = 2;
UPDATE modelos SET modelo = 'MGH MOCI Prime 1P E var' WHERE modelo = 'MGH MOCI Prime 1P E var_BOT' AND linea = 2;
UPDATE modelos SET modelo = 'MGH MOCI Prime 1P E var' WHERE modelo = 'MGH MOCI Prime 1P E var_TOP' AND linea = 2;
UPDATE modelos SET modelo = 'MGH MOCI Prime 3P A var' WHERE modelo = 'MGH MOCI Prime 3P A var_BOT' AND linea = 2;
UPDATE modelos SET modelo = 'MGH MOCI Prime 3P A var' WHERE modelo = 'MGH MOCI Prime 3P A var_TOP' AND linea = 2;
UPDATE modelos SET modelo = 'MGH MOCI Prime C var Delta' WHERE modelo = 'MGH MOCI Prime C var_BOT Delta' AND linea = 2;
UPDATE modelos SET modelo = 'MGH MOCI Prime C var' WHERE modelo = 'MGH MOCI Prime C var_TOP' AND linea = 2;
UPDATE modelos SET modelo = 'MGH MOCI Prime C var Delta' WHERE modelo = 'MGH MOCI Prime C var_TOP Delta' AND linea = 2;

-- Línea 3
UPDATE modelos SET modelo = 'IDB VARIANT H' WHERE modelo = 'IDB VARIANT H TOP' AND linea = 3;
UPDATE modelos SET modelo = 'IDB VARIANT H' WHERE modelo = 'IDB VARIANT H BOT' AND linea = 3;
UPDATE modelos SET modelo = 'IDB VARIANT F' WHERE modelo = 'IDB VARIANT F TOP' AND linea = 3;
UPDATE modelos SET modelo = 'IDB VARIANT F' WHERE modelo = 'IDB VARIANT F BOT' AND linea = 3;
UPDATE modelos SET modelo = 'IDB VARIANT N' WHERE modelo = 'IDB VARIANT N TOP' AND linea = 3;
UPDATE modelos SET modelo = 'IDB VARIANT N' WHERE modelo = 'IDB VARIANT N BOT' AND linea = 3;
UPDATE modelos SET modelo = 'IDB VARIANT L' WHERE modelo = 'IDB VARIANT L TOP' AND linea = 3;
UPDATE modelos SET modelo = 'IDB VARIANT L' WHERE modelo = 'IDB VARIANT L BOT' AND linea = 3;
UPDATE modelos SET modelo = 'IDB VARIANT V' WHERE modelo = 'IDB VARIANT V TOP' AND linea = 3;
UPDATE modelos SET modelo = 'IDB VARIANT V' WHERE modelo = 'IDB VARIANT V BOT' AND linea = 3;
UPDATE modelos SET modelo = 'IPTS N-M F' WHERE modelo = 'IPTS N-M F TOP' AND linea = 3;
UPDATE modelos SET modelo = 'IPTS N-M F' WHERE modelo = 'IPTS N-M F BOT' AND linea = 3;
UPDATE modelos SET modelo = 'IPTS N-M' WHERE modelo = 'IPTS N-M TOP' AND linea = 3;
UPDATE modelos SET modelo = 'IPTS N-M' WHERE modelo = 'IPTS N-M BOT' AND linea = 3;
UPDATE modelos SET modelo = 'RCU H' WHERE modelo = 'RCU H BOT' AND linea = 3;
UPDATE modelos SET modelo = 'RCU H' WHERE modelo = 'RCU H TOP' AND linea = 3;
UPDATE modelos SET modelo = 'IDB VARIANT B' WHERE modelo = 'IDB VARIANT B BOT' AND linea = 3;
UPDATE modelos SET modelo = 'IDB VARIANT AA' WHERE modelo = 'IDB VARIANT AA BOT' AND linea = 3;

-- Línea 4
UPDATE modelos SET modelo = 'IDB VARIANT F' WHERE modelo = 'IDB VARIANT F BOT' AND linea = 4;
UPDATE modelos SET modelo = 'IDB VARIANT F' WHERE modelo = 'IDB VARIANT F TOP' AND linea = 4;
UPDATE modelos SET modelo = 'IDB VARIANT H' WHERE modelo = 'IDB VARIANT H BOT' AND linea = 4;
UPDATE modelos SET modelo = 'IDB VARIANT H' WHERE modelo = 'IDB VARIANT H TOP' AND linea = 4;
UPDATE modelos SET modelo = 'IDB VARIANT L' WHERE modelo = 'IDB VARIANT L BOT' AND linea = 4;
UPDATE modelos SET modelo = 'IDB VARIANT L' WHERE modelo = 'IDB VARIANT L TOP' AND linea = 4;
UPDATE modelos SET modelo = 'IDB VARIANT N' WHERE modelo = 'IDB VARIANT N BOT' AND linea = 4;
UPDATE modelos SET modelo = 'IDB VARIANT N' WHERE modelo = 'IDB VARIANT N TOP' AND linea = 4;
UPDATE modelos SET modelo = 'IDB VARIANT V' WHERE modelo = 'IDB VARIANT V BOT' AND linea = 4;
UPDATE modelos SET modelo = 'IDB VARIANT V' WHERE modelo = 'IDB VARIANT V TOP' AND linea = 4;
UPDATE modelos SET modelo = 'RCU VARIANT H' WHERE modelo = 'RCU VARIANT H BOT' AND linea = 4;
UPDATE modelos SET modelo = 'RCU VARIANT I' WHERE modelo = 'RCU VARIANT I TOP' AND linea = 4;
UPDATE modelos SET modelo = 'RCU VARIANT H' WHERE modelo = 'RCU VARIANT H TOP' AND linea = 4;
UPDATE modelos SET modelo = 'IAMM Dongfeng' WHERE modelo = 'IAMM Dongfeng Bot' AND linea = 4;
UPDATE modelos SET modelo = 'IAMM Dongfeng' WHERE modelo = 'IAMM Dongfeng Top' AND linea = 4;

-- Verificar resultados
SELECT linea, modelo, lado, COUNT(*) as cuenta 
FROM modelos 
GROUP BY linea, modelo, lado 
HAVING COUNT(*) > 1
ORDER BY linea, modelo, lado;
