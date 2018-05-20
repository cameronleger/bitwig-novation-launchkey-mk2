var trackColor = 0x03;
var cachedColors = {};

var pendingLEDStates_iC = initArray(0x00, 18);
var LEDStates_iC = initArray(-1, 18);

var pendingLEDStates_pads = initArray(0x00, 16);
var LEDStates_pads = initArray(-1, 16);

var indicatorStates = initArray(true, 8);
var indicatorExists = initArray(false, 8);
var indicatorNames = initArray('?', 8);

var knobTakeover = initArray(false, 8);
var faderTakeover = initArray(false, 8);

var activeNotes = [];
var padOctave = 0;
var padInput = undefined;

var selectedPage = 0;
var numParameterPages = 0;

var incontrol_mix = true;
var incontrol_knobs = true;
var incontrol_pads = true;

function makeIndexedFunction(index, f)
{
   return function(value)
   {
      f(index, value);
   };
}

function resetTakeovers()
{
   knobTakeover = initArray(false, 8);
   faderTakeover = initArray(false, 8);
}

function softTakeoverKnob(param, index, value)
{
   if (knobTakeover[index])
      param.set(value, 128);
   else if (Math.abs(param.get() - value/128) <= 0.05)
   {
      knobTakeover[index] = true;
      param.set(value, 128);
   }
}

function softTakeoverFader(param, index, value)
{
   if (faderTakeover[index])
      param.set(value, 128);
   else if (Math.abs(param.get() - value/128) <= 0.05)
   {
      faderTakeover[index] = true;
      param.set(value, 128);
   }
}

function softTakeover(param, value)
{
   if (Math.abs(param.get() - value/128) <= 0.20)
      param.set(value, 128);
}

function noteName(note)
{
   noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
   return noteNames[note % 12] + (Math.floor(note / 12) - 2);
}

function LEDColor(red, green, blue)
{
   var cacheName = red + '/' + green + '/' + blue;
   var cachedColor = cachedColors[cacheName];
   if (cachedColor === undefined)
      cachedColors[cacheName] = LEDColors({r: red, g: green, b: blue});
   return cachedColors[cacheName].name;
}

function clearLEDs()
{
   LEDStates_iC = initArray(-1, 18);
   host.getMidiOutPort(1).sendMidi(0xBF, 0x00, 0x00);
}

function cacheLEDs_iC()
{
   if (!incontrol_pads)
   {
      pendingLEDStates_iC = initArray(0x00, 18);
      LEDStates_iC = initArray(-1, 18);
   }
   else
   {
      pendingLEDStates_iC[8] = trackColor;
      pendingLEDStates_iC[17] = trackColor;
      for(var i=0; i<8; i++)
      {
         if (!indicatorExists[i])
         {
            pendingLEDStates_iC[i] = 0x00;
         }
         else if (indicatorStates[i])
         {
            if (i === 0)
               pendingLEDStates_iC[i] = 106;
            else if (i === 1)
               pendingLEDStates_iC[i] = 62;
            else if (i === 2)
               pendingLEDStates_iC[i] = 12;
            else if (i === 3)
               pendingLEDStates_iC[i] = 111;
            else if (i === 4)
               pendingLEDStates_iC[i] = 89;
            else if (i === 5)
               pendingLEDStates_iC[i] = 91;
            else if (i === 6)
               pendingLEDStates_iC[i] = 116;
            else if (i === 7)
               pendingLEDStates_iC[i] = 82;
            else
               pendingLEDStates_iC[i] = trackColor;
         }
         else
         {
            pendingLEDStates_iC[i] = 0x00;
         }

         var j = i + 9;

         if (selectedPage == i)
            pendingLEDStates_iC[j] = 0x03;
         else if (i >= numParameterPages)
            pendingLEDStates_iC[j] = 0x00;
         else
            pendingLEDStates_iC[j] = trackColor;
      }
   }
}

function cacheLEDs_pads()
{
   pendingLEDStates_pads = initArray(0, 16);

   if (incontrol_pads)
   {
      LEDStates_pads = initArray(-1, 16);
   }
   else
   {
      var p;
      var offset = 36 + padOctave*16;
      for (var i in activeNotes)
      {
         p = activeNotes[i].pitch();
         if (p >= offset && p < (offset + 16))
            pendingLEDStates_pads[p - offset] = trackColor;
      }
   }
}

function sendLEDs()
{
   if (incontrol_pads)
   {
      for(var i=0; i<9; i++)
      {
         if (pendingLEDStates_iC[i] != LEDStates_iC[i])
         {
            LEDStates_iC[i] = pendingLEDStates_iC[i];
            host.getMidiOutPort(1).sendMidi(0x9F, 96 + i, LEDStates_iC[i]);
         }

         var j = i + 9;
         if (pendingLEDStates_iC[j] != LEDStates_iC[j])
         {
            LEDStates_iC[j] = pendingLEDStates_iC[j];
            host.getMidiOutPort(1).sendMidi(0x9F, 112 + i, LEDStates_iC[j]);
         }
      }
   }
   else
   {
      for(var i=0; i<16; i++)
      {
         if (pendingLEDStates_pads[i] != LEDStates_pads[i])
         {
            LEDStates_pads[i] = pendingLEDStates_pads[i];
            host.getMidiOutPort(1).sendMidi(0x9F, 36 + i, LEDStates_pads[i]);
         }
      }
      host.getMidiOutPort(1).sendMidi(0xBF, 104, 0x03);
      host.getMidiOutPort(1).sendMidi(0xBF, 105, 0x01);
   }
}


var LEDColors = nearestColor.from({
   '0':   {r: 0,   g: 0,   b: 0},
   '1':   {r: 33 , g: 33 , b: 33},
   '2':   {r: 129, g: 129, b: 129},
   '3':   {r: 228, g: 228, b: 228},
   '4':   {r: 229, g: 92 , b: 79},
   '5':   {r: 229, g: 37 , b: 0},
   '6':   {r: 99 , g: 9,   b: 0},
   '7':   {r: 31 , g: 1,   b: 0},

   '8':   {r: 229, g: 180, b: 105},
   '9':   {r: 229, g: 98 , b: 0},
   '10':  {r: 99 , g: 37 , b: 0},
   '11':  {r: 43 , g: 28 , b: 0},
   '12':  {r: 228, g: 225, b: 37},
   '13':  {r: 228, g: 225, b: 0},
   '14':  {r: 96 , g: 95 , b: 0},
   '15':  {r: 29 , g: 28 , b: 0},

   '16':  {r: 128, g: 223, b: 49},
   '17':  {r: 62 , g: 223, b: 0},
   '18':  {r: 21 , g: 95 , b: 0},
   '19':  {r: 21 , g: 46 , b: 0},
   '20':  {r: 45 , g: 223, b: 50},
   '21':  {r: 0,   g: 223, b: 0},
   '22':  {r: 0,   g: 94 , b: 0},
   '23':  {r: 0,   g: 28 , b: 0},

   '24':  {r: 44 , g: 223, b: 78},
   '25':  {r: 0,   g: 223, b: 0},
   '26':  {r: 0,   g: 94 , b: 0},
   '27':  {r: 0,   g: 28 , b: 0},
   '28':  {r: 42 , g: 224, b: 130},
   '29':  {r: 0,   g: 223, b: 67},
   '30':  {r: 0,   g: 95 , b: 22},
   '31':  {r: 0,   g: 32 , b: 16},

   '32':  {r: 38 , g: 224, b: 171},
   '33':  {r: 0,   g: 223, b: 146},
   '34':  {r: 0,   g: 95 , b: 58},
   '35':  {r: 0,   g: 28 , b: 16},
   '36':  {r: 59 , g: 183, b: 229},
   '37':  {r: 0,   g: 135, b: 229},
   '38':  {r: 0,   g: 73 , b: 90},
   '39':  {r: 0,   g: 18 , b: 29},

   '40':  {r: 72 , g: 140, b: 229},
   '41':  {r: 0,   g: 97 , b: 229},
   '42':  {r: 0,   g: 35 , b: 98},
   '43':  {r: 0,   g: 6,   b: 30},
   '44':  {r: 79 , g: 91 , b: 229},
   '45':  {r: 4,   g: 46 , b: 229},
   '46':  {r: 1,   g: 14 , b: 99},
   '47':  {r: 0,   g: 2,   b: 30},

   '48':  {r: 136, g: 92 , b: 229},
   '49':  {r: 90 , g: 48 , b: 229},
   '50':  {r: 26 , g: 17 , b: 110},
   '51':  {r: 11 , g: 5,   b: 58},
   '52':  {r: 229, g: 98 , b: 22},
   '53':  {r: 229, g: 58 , b: 229},
   '54':  {r: 100, g: 20 , b: 98},
   '55':  {r: 31 , g: 2,   b: 30},

   '56':  {r: 229, g: 94 , b: 135},
   '57':  {r: 229, g: 40 , b: 90},
   '58':  {r: 99 , g: 11 , b: 31},
   '59':  {r: 40 , g: 2,   b: 18},
   '60':  {r: 229, g: 46 , b: 0},
   '61':  {r: 156, g: 65 , b: 0},
   '62':  {r: 128, g: 89 , b: 0},
   '63':  {r: 70 , g: 105, b: 0},

   '64':  {r: 0,   g: 62 , b: 0},
   '65':  {r: 0,   g: 91 , b: 58},
   '66':  {r: 0,   g: 93 , b: 131},
   '67':  {r: 4,   g: 46 , b: 229},
   '68':  {r: 0,   g: 76 , b: 86},
   '69':  {r: 33 , g: 38 , b: 197},
   '70':  {r: 129, g: 129, b: 129},
   '71':  {r: 38 , g: 38 , b: 38},

   '72':  {r: 229, g: 35 , b: 0},
   '73':  {r: 176, g: 224, b: 0},
   '74':  {r: 165, g: 212, b: 0},
   '75':  {r: 87 , g: 223, b: 0},
   '76':  {r: 0,   g: 135, b: 0},
   '77':  {r: 0,   g: 223, b: 127},
   '78':  {r: 0,   g: 165, b: 229},
   '79':  {r: 2,   g: 57 , b: 229},

   '80':  {r: 63 , g: 46 , b: 229},
   '81':  {r: 126, g: 49 , b: 229},
   '82':  {r: 175, g: 45 , b: 130},
   '83':  {r: 75 , g: 39 , b: 0},
   '84':  {r: 229, g: 88 , b: 0},
   '85':  {r: 131, g: 203, b: 0},
   '86':  {r: 103, g: 223, b: 0},
   '87':  {r: 0,   g: 223, b: 0},

   '88':  {r: 0,   g: 223, b: 0},
   '89':  {r: 68 , g: 223, b: 104},
   '90':  {r: 0,   g: 224, b: 191},
   '91':  {r: 87 , g: 140, b: 229},
   '92':  {r: 45 , g: 92 , b: 190},
   '93':  {r: 134, g: 131, b: 217},
   '94':  {r: 200, g: 57 , b: 229},
   '95':  {r: 229, g: 40 , b: 98},

   '96':  {r: 229, g: 131, b: 0},
   '97':  {r: 177, g: 169, b: 0},
   '98':  {r: 137, g: 223, b: 0},
   '99':  {r: 134, g: 100, b: 0},
   '100': {r: 67 , g: 47 , b: 0},
   '101': {r: 5,   g: 83 , b: 3},
   '102': {r: 0,   g: 87 , b: 64},
   '103': {r: 22 , g: 23 , b: 49},

   '104': {r: 17 , g: 40 , b: 98},
   '105': {r: 113, g: 69 , b: 26},
   '106': {r: 169, g: 23 , b: 0},
   '107': {r: 210, g: 94 , b: 61},
   '108': {r: 206, g: 113, b: 0},
   '109': {r: 229, g: 205, b: 0},
   '110': {r: 150, g: 204, b: 0},
   '111': {r: 100, g: 171, b: 0},

   '112': {r: 32 , g: 33 , b: 58},
   '113': {r: 203, g: 225, b: 92},
   '114': {r: 119, g: 224, b: 177},
   '115': {r: 150, g: 154, b: 229},
   '116': {r: 143, g: 113, b: 229},
   '117': {r: 73 , g: 73 , b: 73},
   '118': {r: 121, g: 121, b: 121},
   '119': {r: 205, g: 227, b: 228},

   '120': {r: 163, g: 22 , b: 0},
   '121': {r: 63 , g: 4,   b: 0},
   '122': {r: 0,   g: 192, b: 0},
   '123': {r: 0,   g: 71 , b: 0},
   '124': {r: 177, g: 169, b: 0},
   '125': {r: 70 , g: 56 , b: 0},
   '126': {r: 175, g: 102, b: 0},
   '127': {r: 84 , g: 25 , b: 0},
});