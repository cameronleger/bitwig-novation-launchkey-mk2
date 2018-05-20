# Novation LaunchKeys 49 Mk2 (black) Bitwig Controller Script
* Does not support the Mk1 (gray); protocol is different
* Probably supports the 25 and 61 variants (25 at a loss of some functionality)
* Bitwig API 6 for the most up-to-date features
* Enhanced Pad bank (octaves, colors)

## Functionality at-a-glance
* Keys, Wheels, and Octave Transpose work as usual
* Soft-takeover for Faders/Knobs on Remote Control pages and User Controls
* Visual notifications for most buttons/adjustments

### Faders
* InControl Mode
  * Track/Channel selectors navigate Tracks
  * Faders adjust current Device Remote Control Page values
  * Fader buttons toggle mapping of each Device Remote Control
  * Master Fader adjusts Current Track Volume
  * Master Fader button selects Master Track
* Basic Mode
  * Track/Channel selectors 'slide' the 8-Track Bank across Tracks
  * Faders adjust Track in Bank volumes
  * Fader buttons select Track in Bank
  * Master Fader adjusts Master Track volume
  * Master Fader button selects Master Track

### Knobs
  * InControl Mode
    * Knobs adjust current Device Remote Control Page values
  * Basic Mode
    * Knobs adjust User Control values (can be mapped)

### Pads
  * InControl Mode
    * Top row toggles mapping of Faders/Knobs to Remote Controls
    * Top row is colored by Remote Control color or nothing for unmapped/unavailable
    * Bottom row selects Pages of Remote Controls
    * Bottom row is colored by the Track and indicates selected/available Remote Control Pages
    * Top play Pad selects the next Device on the Track
    * Bottom play Pad selects the previous Device on the Track
    * When navigating Devices, the Remote Controls section visibility is shown/hidden for the current/previous Device
  * Basic Mode
    * Pads are used as Note Inputs (imagine a 4x4 grid, but cut it in half and show the bottom on the left and top on the right)
    * Pads are colored by the Track color and indicate played notes (live and playback)
    * Top play Pad shifts the Pad's starting note up by 16 (transposing)
    * Bottom play Pad shifts the Pad's starting note down by 16 (transposing)

### Transport Controls
Mapped to the appropriate Bitwig Transport Controls

## Changes from the Bitwig shipped version
* Enhanced Pad color support
* Most changes resulted from API deprecations
* Altered InControl Pad mappings
* Knobs/Faders use Remote Control pages, instead of direct Parameters and Macros
* Pads do not blink
* Unmapped parameters no longer change values
* Round Pad 'play' buttons navigate Devices instead of Presets