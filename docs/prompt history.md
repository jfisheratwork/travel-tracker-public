Prompt History

This document outlines the chronological sequence of prompts used to build the Family Travel Tracker application.

Initial Request (Google Sheet)

"Help me create a google sheet that can help me track which national parks our family has visited. It will need columns for each family member Jake, Lisa, Travis, Grace, Lucas and a row for each US National Park"

Tabbed Interface

"Make this a two tab page. one tab for tracking national parks visited and one tab for tracking states and provinces visited"

Sorting

"Make each column sortable by clicking on the column title"

Individual Progress

"Under the family progress section make a progress per person tracker"

Select All

"Make a new first column that makes it easy to select all participants in the row"

CSV Import

"Include an import from csv button as well to make it easy to repopulate"

Google Sheets Export

"How about export to Google Sheets option as well"

Regional Breakout (Stats)

"Can you break out the state vs provinces visited?"

Basic Map Tab

"Can you add a third tab that shows the national parks on a maps as location dots green for visited by all, yellow for partially visited, and gray for not yet visited?"

States Map Attempt (SVG)

"Add a states and provinces listed map as a 4th tab. Green background for all visited, yellow for partial, and no background for not yet visited"

States Map (Real Map Attempt)

"Let's try to do the state map again. I want you to use a real map like you did for the parks map. We can indicate the states that are visited with a green location marker on the capital of the state or province for everyone visited and we can use a yellow marker on the capital for a partially visited"

Restoration

"Wait, I didn't want you to get rid of my previous work and create this new tracker. Help me get back the old old work prior to the last two prompts."

Reset

"We need to start over. Create a blank html page"

Manual Content Update

"OK, I've updated the content of the page. Please read that code and be ready to start updating from there."

Regional Breakout (Retry)

"Can you break out the state vs provinces visited?"

Per Person Breakout

"For states and provinces can you also break out per person?"

World Map Tab

"Let's add a map tab that displays a full map of the world."

Map Zoom

"Zoom the map to North America"

Park Markers

"Mark all the national parks that I have visited using a green location for the whole family has visited and a yellow location pin for only some have visited."

Capital Markers

"Update the map to do the same thing with markers for the capital for each province or state. Green first state that everyone has visited, yellow for partial, gray for not yet."

Custom Icons (Trees & Stars)

"Can you make the map location icon for the national parks something that looks like a tree and the map icon for the states and capitals to be a star"

Tree Icon Refinement (Emoji)

"lets find a better icon for the national parks marker that one doesn't look much like a tree. Maybe we could use an emoji?"

Annotation Request

"Annotate the code with additional comments and references to help me better understand not only the code itself, but where I can look up the information on how each HtmL element or JavaScript function works"

Data Structure Explanation

"Can you help explain the data format that you are storing the information to for local storage after you have explained it think about what changes would be necessary if we wanted to make the list of family members dynamic"

Settings Popup

"Can you let's add a settings gear that adds a pop-up where we can configure some of the options for this site. Let's make the first configural option whether or not we want to show only states or states and provinces using two check boxes."

Canadian Parks Option

"lets add a configurable option to also include Canadian national parks. Off by default"

Dropdown & Stats Logic Fixes

"Now that we have Canadian national parks we need to fix a couple things. Family Completion for national parks needs to be broken out by country. The dropdown for visible locations should be dynamic such that if use or Canadian settings is not enabled it won't show in the dropdown"

Stats Tab

"Make this say "Detailed Stats & Provinces". Then Move this section to a new tab called stats"

Export Modal

"Let's create a new export popup and move the export and import functionality there. Update the labels for the import/export accordingly to distinguish between parks vs states/prov"

UI Refinement (Height/Scroll)

"make the export popup and settings popup both a max height of 75% of window with internal scroll if needed. Also move the export/import Data link next to the settings gear and use a the download icon in place of full text"

Default Names

"For the family names load a a default set of names John, Jane, Jim, Jess. Make sure all settings are stored in local storage so if we refresh the page the settings are retained."

Example Data Dropdown

"Update the populateExamplesDropdown to use this code..."

USA Parks Setting

"Update the settings to also include a check box for include USA national parks"

Locked Table Header

"Let's make the header row of the tables locked with a local table scroll. Make the height of the table overall fill to the bottom of the window or 800 px whatever is less"

Metadata Editing

"For each row in the park or state table add edit link (use a wrench icon) that opens a popup letting a user add meta data for the family/row that has en entry for date visited (default to Jan 1st of the current year) and a comment text box input that allows for up to 500 chars of content (add a counter to text box)"

Metadata Refinements

"- Remove the default date from the edit popup\n- Make sure the map tooltip display date visited if known and the comments if present"

Example Data Import Logic

"Create an import dropdown in the import/export menu that will look in a subfolder called examples(if present) and for each '.json' file found add that entry to the import. If someone selects the file from the dropdown and clicks import please import the json as if it was a json back up file"

Default Visibility

"all location visibility settings should be on by default"

Dynamic Family Members

"Lets make the family members.\n\nAdd a new section to the settings tab that lets us populate the names of the family members to use.\n\nIf no names have yet been chosen add a warning bubble to top of page 'Please Update Settings' and red border around settings icon."

Map Selection Border

"if the icon is selected on the map please add a blue border to the icon"

Visited Map Border

"If the park or state is visited in any way it should have an orange border for the map icons"

Documentation & Organization

"Please annotate all of the code with documentation and details. In particular for each library used add a link to the home page and a short summary for the library. For html elements add short description the first time it is encountered with a link for more details. For javascript functions add a high level summary of how it works. For all data related arrays and constants add those in a single section near the top of the html document."
