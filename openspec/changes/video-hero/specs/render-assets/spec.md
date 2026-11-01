## ADDED Requirements

### Requirement: Hero video encoding
The encoding tool SHALL turn a rendered frame sequence into the hero video for one orientation: an AV1 MP4 and an H.264 MP4 at the frames' own size, 24 frames per second, with no audio track and the index at the front of the file. It SHALL write or update a manifest describing them and SHALL report each file's size.

#### Scenario: Encoding a sequence
- **WHEN** the tool is run on a complete rendered sequence with an orientation
- **THEN** it writes both video files for that orientation, updates the manifest, and reports the size of each file

### Requirement: Hero video manifest
The hero manifest SHALL state: schema version 2, frames per second, frame count, the start and end frame of each construction phase, and for each orientation the video's dimensions and its sources in order of preference, each with URL, MIME type including codecs, and byte size.

#### Scenario: Player reads phase ranges
- **WHEN** a client reads the manifest
- **THEN** it can find which frames, and so which playback times, belong to each of the six phases without any other source

## REMOVED Requirements

### Requirement: Frame sequence encoding
**Reason**: The hero ships as a video, not as individually encoded frames.
**Migration**: See Hero video encoding.

### Requirement: Sequence manifest
**Reason**: Replaced by the version 2 manifest, which lists video sources instead of frame tiers.
**Migration**: See Hero video manifest.
