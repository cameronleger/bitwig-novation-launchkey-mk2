
loadAPI(6);

host.defineController("Novation", "Launchkey MK2 49", "1.0", "8D2EF860-5786-11E8-B566-0800200C9A66", "Cameron Leger");
host.defineMidiPorts(2, 2);
host.addDeviceNameBasedDiscoveryPair(["Launchkey MK2 49", "MIDIIN2 (Launchkey MK2 49)"], ["Launchkey MK2 49", "MIDIOUT2 (Launchkey MK2 49)"]);
host.addDeviceNameBasedDiscoveryPair(["Launchkey MK2 49 MIDI 1", "Launchkey MK2 49 MIDI 2"], ["Launchkey MK2 49 MIDI 1", "Launchkey MK2 49 MIDI 2"]);

load("nearestColor.js");
load("launchkey_mk2_common.js");

function init()
{
   host.getMidiInPort(0).createNoteInput("Launchkey MK2 49", "80????", "90????", "B001??", "B040??", "D0????", "E0????");
   // create the note input, but ignore the pads to recreate the events later
   padInput = host.getMidiInPort(0).createNoteInput("Launchkey Pads", "012345");

   host.getMidiInPort(0).setMidiCallback(onMidi0);
   host.getMidiInPort(1).setMidiCallback(onMidi1);

	transport = host.createTransportSection();

   cursorTrack = host.createCursorTrackSection(0, 8);
   cursorTrack.getVolume().markInterested();

   cursorTrack.color().addValueObserver(function(r, g, b) {
      trackColorR = Math.floor(r * 255);
      trackColorG = Math.floor(g * 255);
      trackColorB = Math.floor(b * 255);
      trackColor = Number(LEDColor(trackColorR, trackColorG, trackColorB));
   });

   cursorTrack.playingNotes().addValueObserver(function(notes) {
      activeNotes = notes;
   });

   masterTrack = host.createMasterTrackSection(0);
   masterTrack.getVolume().markInterested();

   selectedDevice = cursorTrack.createCursorDevice();
   selectedDevicePage = selectedDevice.createCursorRemoteControlsPage(8);

   selectedDevice.channel().name().addValueObserver(function(channel)
   {
      resetTakeovers();
   });

   selectedDevice.position().addValueObserver(function(position)
   {
      resetTakeovers();
   });

   for(var p=0; p<8; p++)
   {
      selectedDevicePage.getParameter(p).name().addValueObserver(makeIndexedFunction(p, function(p, name) {
         indicatorNames[p] = name;
      }));
      selectedDevicePage.getParameter(p).exists().addValueObserver(makeIndexedFunction(p, function(p, exists) {
         indicatorExists[p] = exists;
      }));
      selectedDevicePage.getParameter(p).markInterested();
   }

   selectedDevicePage.selectedPageIndex().addValueObserver(function(value)
   {
      selectedPage = value;
      resetTakeovers();
   }, -1);

   selectedDevicePage.pageNames().addValueObserver(function(pages)
   {
      numParameterPages = pages.length;
      resetTakeovers();
   });

   trackBank = host.createTrackBankSection(8, 0, 0);

   for(var p=0; p<8; p++)
   {
      trackBank.getTrack(p).getVolume().markInterested();
   }

   userControls = host.createUserControls(8);

   for(var p=0; p<8; p++)
   {
      userControls.getControl(p).setLabel("User " + (p + 1));
      userControls.getControl(p).markInterested();
   }

   // set to extended mode
   clearLEDs();
   sendMidi(0x9F, 0x0C, 0x7F);
   host.getMidiOutPort(1).sendMidi(0x9F, 0x0C, 0x7F);
   host.getMidiOutPort(1).sendMidi(0x9F, 0x0D, 0x7F);
   host.getMidiOutPort(1).sendMidi(0x9F, 0x0E, 0x7F);
   host.getMidiOutPort(1).sendMidi(0x9F, 0x0F, 0x7F);

   updateIndications();
}

function updateIndications()
{
   for(var i=0; i<8; i++)
   {
      selectedDevicePage.getParameter(i).setIndication(incontrol_knobs && indicatorStates[i]);
      userControls.getControl(i).setIndication(!incontrol_knobs);
      trackBank.getTrack(i).getVolume().setIndication(!incontrol_mix);
   }
}

function exit()
{
   // set to basic mode
   sendMidi(0x9F, 0x0C, 0x00);
   clearLEDs();
}

function flush()
{
   cacheLEDs_iC();
   cacheLEDs_pads();
   sendLEDs();
}

function onMidi0(status, data1, data2)
{
   //println('MIDI0 Channel: ' + MIDIChannel(status));
	//printMidi(status, data1, data2);

   if (isChannelController(status))
   {
      if (data1 >= 21 && data1 <= 28)
      {
         var knobIndex = data1 - 21;

         softTakeoverKnob(userControls.getControl(knobIndex), knobIndex, data2);
      }
      else if (data1 >= 41 && data1 <= 48)
      {
         var faderIndex = data1 - 41;

         softTakeoverFader(trackBank.getTrack(faderIndex).getVolume(), faderIndex, data2);
      }
      else if (data1 == 7)
      {
         softTakeover(masterTrack.getVolume(), data2);
      }
      else if (data1 >= 51 && data1 <= 58 && data2 == 127)
      {
         var buttonIndex = data1 - 51;

         trackBank.getTrack(buttonIndex).select();
      }
      else if (data1 == 59 && data2 == 127)
      {
         masterTrack.select();
      }
      else if (data1 == 104 && data2 == 127)
      {
         if (padOctave < 4)
            padOctave += 1;
         host.showPopupNotification("Pads: " + noteName(36 + (padOctave*16)));
      }
      else if (data1 == 105 && data2 == 127)
      {
         if (padOctave > -2)
            padOctave -=1;
         host.showPopupNotification("Pads: " + noteName(36 + (padOctave*16)));
      }
   }

   if (MIDIChannel(status) && data1 >= 36 && data1 <= 51)
   {
      padInput.sendRawMidiEvent(status, data1 + (padOctave*16), data2);
   }
}

function onMidi1(status, data1, data2)
{
   //println('MIDI1 Channel: ' + MIDIChannel(status));
   //printMidi(status, data1, data2);

   if (isChannelController(status))
   {
      if (data1 >= 21 && data1 <= 28)
      {
         var i = data1 - 21; // knobs

         if (indicatorStates[i])
            softTakeoverKnob(selectedDevicePage.getParameter(i), i, data2);
      }
      else if (data1 >= 41 && data1 <= 48)
      {
         var i = data1 - 41; // faders

         if (indicatorStates[i])
            softTakeoverFader(selectedDevicePage.getParameter(i), i, data2);
      }
      else if (data1 == 7)
      {
         softTakeover(cursorTrack.getVolume(), data2);
      }
      else if (data1 >= 51 && data1 <= 58 && data2 == 127)
      {
         var i = data1 - 51;

         indicatorStates[i] = !indicatorStates[i];
         host.showPopupNotification("Mapping '" + indicatorNames[i] + "': " + indicatorStates[i]);
         updateIndications();
      }
      else if (data1 == 59 && data2 == 127)
      {
         masterTrack.select();
      }

      if (data2 == 127)
      {
         // button presses

         if (data1 == 102)
         {
            if (incontrol_mix)
            {
               cursorTrack.selectPrevious();
               cursorTrack.makeVisibleInArranger();
            }
            else
            {
               trackBank.scrollTracksPageUp();
            }
         }
         else if (data1 == 103)
         {
            if (incontrol_mix)
            {
               cursorTrack.selectNext();
               cursorTrack.makeVisibleInArranger();
            }
            else
            {
               trackBank.scrollTracksPageDown();
            }
         }
         else if (data1 == 112)
         {
            transport.rewind();
         }
         else if (data1 == 113)
         {
            transport.fastForward();
         }
         else if (data1 == 114)
         {
            transport.stop();
         }
         else if (data1 == 115)
         {
            transport.play();
         }
         else if (data1 == 116)
         {
            transport.toggleLoop();
         }
         else if (data1 == 117)
         {
            transport.record();
         }
      }
   }

   if (MIDIChannel(status) == 15 && isNoteOn(status))
   {
      if (data1 >= 96 && data1 <= 103)
      {
         var i = data1 - 96;

         indicatorStates[i] = !indicatorStates[i];
         host.showPopupNotification("Mapping '" + indicatorNames[i] + "': " + indicatorStates[i]);
         updateIndications();
      }
      else if (data1 >= 112 && data1 <= 119)
      {
         var i = data1 - 112;

         if (i < numParameterPages)
         {
            selectedDevicePage.selectedPageIndex().set(i);
            updateIndications();
         }
      }
      else if (data1 == 104)
      {
         selectedDevice.isRemoteControlsSectionVisible().set(false);
         selectedDevice.selectPrevious();
         selectedDevice.isRemoteControlsSectionVisible().set(true);
         updateIndications();
      }
      else if (data1 == 120)
      {
         selectedDevice.isRemoteControlsSectionVisible().set(false);
         selectedDevice.selectNext();
         selectedDevice.isRemoteControlsSectionVisible().set(true);
         updateIndications();
      }

      if (data1 == 13)
      {
         incontrol_knobs = data2 == 127;
         host.showPopupNotification(incontrol_knobs ? "Knobs: Parameters" : "Knobs: User Mappings");
         updateIndications();
      }
      else if (data1 == 14)
      {
         incontrol_mix = data2 == 127;
         host.showPopupNotification(incontrol_mix ? "Sliders: Macros" : "Sliders: Mixer");
         updateIndications();
      }
      else if (data1 == 15)
      {
         incontrol_pads = data2 == 127;
         padOctave = 0;
         host.showPopupNotification(incontrol_pads ? "Parameter Page & Modulation" : "Drum Pads: " + noteName(36 + (padOctave*16)));
         clearLEDs();
         updateIndications();
      }
   }
}
