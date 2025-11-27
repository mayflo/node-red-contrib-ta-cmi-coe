/**
 * Central Unit Definitions for TA CMI CoE
 * 
 * Copyright 2025 Florian Mayrhofer
 * Licensed under the Apache License, Version 2.0
 *
 */  

// Central Unit Definitions

const UNITS = {
0: { name_de: 'Dimensionslos', symb_de: '',name_en: 'Dimensionless', symb_en: '', decimals: 0 },
1: { name_de: 'Temperatur °C', symb_de: '°C',name_en: 'Temperature °C', symb_en: '°C', decimals: 1 },
2: { name_de: 'Solarstrahlung', symb_de: 'W/m²',name_en: 'Solar radiation', symb_en: 'W/m²', decimals: 0 },
3: { name_de: 'Durchfluss l/h', symb_de: 'l/h',name_en: 'Flow rate l/h', symb_en: 'l/h', decimals: 0 },
4: { name_de: 'Sekunden', symb_de: 'Sek',name_en: 'Seconds', symb_en: 'sec', decimals: 0 },
5: { name_de: 'Minuten', symb_de: 'Min',name_en: 'Minutes', symb_en: 'min', decimals: 0 },
6: { name_de: 'Durchfluss l/Imp', symb_de: 'l/Imp',name_en: 'Flow rate l/Imp', symb_en: 'l/Imp', decimals: 1 },
7: { name_de: 'Temperatur', symb_de: 'K',name_en: 'Temperature', symb_en: 'K', decimals: 1 },
8: { name_de: 'Prozent', symb_de: '%',name_en: 'Percent', symb_en: '%', decimals: 1 },
10: { name_de: 'Leistung kW', symb_de: 'kW',name_en: 'Power kW', symb_en: 'kW', decimals: 1 },
11: { name_de: 'Energie kWh', symb_de: 'kWh',name_en: 'Energy kWh', symb_en: 'kWh', decimals: 1 },
12: { name_de: 'Energie MWh', symb_de: 'MWh',name_en: 'Energy MWh', symb_en: 'MWh', decimals: 0 },
13: { name_de: 'Spannung', symb_de: 'V',name_en: 'Voltage', symb_en: 'V', decimals: 2 },
14: { name_de: 'Stromstärke mA', symb_de: 'mA',name_en: 'Current mA', symb_en: 'mA', decimals: 1 },
15: { name_de: 'Stunden', symb_de: 'Std',name_en: 'Hours', symb_en: 'hr', decimals: 0 },
16: { name_de: 'Tage', symb_de: 'Tage',name_en: 'Days', symb_en: 'Days', decimals: 0 },
17: { name_de: 'Anzahl Impulse', symb_de: 'Imp',name_en: 'Number of pulses', symb_en: 'Imp', decimals: 0 },
18: { name_de: 'Widerstand', symb_de: 'kΩ',name_en: 'Resistance', symb_en: 'kΩ', decimals: 2 },
19: { name_de: 'Liter', symb_de: 'l',name_en: 'Liters', symb_en: 'l', decimals: 0 },
20: { name_de: 'Geschwindigkeit km/h', symb_de: 'km/h',name_en: 'Speed km/h', symb_en: 'km/h', decimals: 0 },
21: { name_de: 'Frequenz', symb_de: 'Hz',name_en: 'Frequency', symb_en: 'Hz', decimals: 2 },
22: { name_de: 'Durchfluss l/min', symb_de: 'l/min',name_en: 'Flow rate l/min', symb_en: 'l/min', decimals: 0 },
23: { name_de: 'Druck bar', symb_de: 'bar',name_en: 'Pressure bar', symb_en: 'bar', decimals: 2 },
24: { name_de: 'Arbeitszahl', symb_de: '',name_en: 'COP', symb_en: '', decimals: 2 },
25: { name_de: 'Länge km', symb_de: 'km',name_en: 'Length km', symb_en: 'km', decimals: 0 },
26: { name_de: 'Länge m', symb_de: 'm',name_en: 'Length m', symb_en: 'm', decimals: 1 },
27: { name_de: 'Länge mm', symb_de: 'mm',name_en: 'Length mm', symb_en: 'mm', decimals: 1 },
28: { name_de: 'Kubikmeter', symb_de: 'm³',name_en: 'Cubic meters', symb_en: 'm³', decimals: 0 },
35: { name_de: 'Durchfluss l/d', symb_de: 'l/d',name_en: 'Flow rate l/d', symb_en: 'l/d', decimals: 0 },
36: { name_de: 'Geschwindigkeit m/s', symb_de: 'm/s',name_en: 'Speed m/s', symb_en: 'm/s', decimals: 0 },
37: { name_de: 'Durchfluss m³/min', symb_de: 'm³/min',name_en: 'Flow rate m³/min', symb_en: 'm³/min', decimals: 0 },
38: { name_de: 'Durchfluss m³/h', symb_de: 'm³/h',name_en: 'Flow rate m³/h', symb_en: 'm³/h', decimals: 0 },
39: { name_de: 'Durchfluss m³/d', symb_de: 'm³/d',name_en: 'Flow rate m³/d', symb_en: 'm³/d', decimals: 0 },
40: { name_de: 'Geschwindigkeit mm/min', symb_de: 'mm/min',name_en: 'Speed mm/min', symb_en: 'mm/min', decimals: 0 },
41: { name_de: 'Geschwindigkeit mm/h', symb_de: 'mm/h',name_en: 'Speed mm/h', symb_en: 'mm/h', decimals: 0 },
42: { name_de: 'Geschwindigkeit mm/d', symb_de: 'mm/d',name_en: 'Speed mm/d', symb_en: 'mm/d', decimals: 0 },
43: { name_de: 'Digital (aus/ein)', symb_de: 'Aus/Ein',name_en: 'Digital (off/on)', symb_en: 'Off/On', decimals: 0 },
44: { name_de: 'Digital (nein/ja)', symb_de: 'Nein/Ja',name_en: 'Digital (no/yes)', symb_en: 'No/Yes', decimals: 0 },
46: { name_de: 'RAS', symb_de: '°C',name_en: 'RAS', symb_en: '°C', decimals: 1 },
50: { name_de: 'Euro', symb_de: '€',name_en: 'Euro', symb_en: '€', decimals: 2 },
51: { name_de: 'Dollar', symb_de: '$',name_en: 'Dollar', symb_en: '$', decimals: 2 },
52: { name_de: 'Absolute Feuchte', symb_de: 'g/m³',name_en: 'Absolute humidity', symb_en: 'g/m³', decimals: 1 },
53: { name_de: 'Dimensionslos(,5)', symb_de: '',name_en: 'Dimensional (.5)', symb_en: '', decimals: 5 },
54: { name_de: 'Grad (Winkel)', symb_de: '°',name_en: 'Degrees (Angle)', symb_en: '°', decimals: 1 },
56: { name_de: 'Grad (1/100 .6)', symb_de: '°',name_en: 'Degrees (.6)', symb_en: '°', decimals: 6 },
57: { name_de: 'Sekunden', symb_de: 's',name_en: 'Seconds', symb_en: 's', decimals: 1 },
58: { name_de: 'Dimensionslos(,1)', symb_de: '',name_en: 'Dimensional (.1)', symb_en: '', decimals: 1 },
59: { name_de: 'Prozent (,0)', symb_de: '%',name_en: 'Percent (.0)', symb_en: '%', decimals: 0 },
60: { name_de: 'Uhrzeit', symb_de: 'h',name_en: 'Time', symb_en: 'h', decimals: 0 },
63: { name_de: 'Stromstärke A', symb_de: 'A',name_en: 'Current A', symb_en: 'A', decimals: 1 },
65: { name_de: 'Druck mbar', symb_de: 'mbar',name_en: 'Pressure mbar', symb_en: 'mbar', decimals: 1 },
66: { name_de: 'Druck Pa', symb_de: 'Pa',name_en: 'Pressure Pa', symb_en: 'Pa', decimals: 0 },
67: { name_de: 'CO2-Gehalt ppm', symb_de: 'ppm',name_en: 'CO2 content ppm', symb_en: 'ppm', decimals: 0 },
68: { name_de: '', symb_de: '',name_en: '', symb_en: '', decimals: 0 },
69: { name_de: 'Leistung W', symb_de: 'W',name_en: 'Power W', symb_en: 'W', decimals: 0 },
70: { name_de: 'Gewicht t', symb_de: 't',name_en: 'Weight t', symb_en: 't', decimals: 2 },
71: { name_de: 'Gewicht kg', symb_de: 'kg',name_en: 'Weight kg', symb_en: 'kg', decimals: 1 },
72: { name_de: 'Gewicht g', symb_de: 'g',name_en: 'Weight g', symb_en: 'g', decimals: 1 },
73: { name_de: 'Länge cm', symb_de: 'cm',name_en: 'Length cm', symb_en: 'cm', decimals: 1 },
74: { name_de: 'Temperatur K', symb_de: 'K',name_en: 'Temperature K', symb_en: 'K', decimals: 0 },
75: { name_de: 'Lichtstärke', symb_de: 'lx',name_en: 'Light intensity', symb_en: 'lx', decimals: 1 },
76: { name_de: 'Radonkonzentration', symb_de: 'Bq/m³',name_en: 'Radon concentration', symb_en: 'Bq/m³', decimals: 0 },
77: { name_de: 'Preis ct/kWh', symb_de: 'ct/kWh',name_en: 'Price ct/kWh', symb_en: 'ct/kWh', decimals: 3 },
78: { name_de: 'Digital (geschl./offen)', symb_de: 'Geschlossen/Offen',name_en: 'Digital (closed/open)', symb_en: 'Closed/Open', decimals: 0 }
};

module.exports = UNITS;