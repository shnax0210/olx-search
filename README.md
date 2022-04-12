# Search items by text on olx

Allows filtering olx items by checking strings that it must include and strings that it must NOT include.
Allows filtering items by publication date.
Allows running the script in loop to check only new items (ones new items appear sound is played to notify user).

## Before usage:

- install nodejs (`brew install npm` on Mac);
- navigate to root folder and run `npm install`;

## Usage examples:

### Search items and print:
```
node main.js --baseUrl "https://www.olx.ua/nedvizhimost/kvartiry/dolgosrochnaya-arenda-kvartir/dnepr/?search%5Bfilter_float_floor%3Ato%5D=10" \
             --numberOfPages 5 \
             --includes "живот" "питом" \
             --excludes "Без животных" "без животных" "Без питомцев" "без питомцев" "С животными не берем"
```

### Search items published later than 60 minutes ago and print:
```
node main.js --baseUrl "https://www.olx.ua/nedvizhimost/kvartiry/dolgosrochnaya-arenda-kvartir/dnepr/?search%5Bfilter_float_floor%3Ato%5D=10" \
             --numberOfPages 5 \
             --includes "живот" "питом" \
             --excludes "Без животных" "без животных" "Без питомцев" "без питомцев" "С животными не берем" \
             --maxMinutes 60
```

### Search items published later than 60 minutes ago in loop each 90 seconds, if found print them and play sound:
```
node main.js --baseUrl "https://www.olx.ua/nedvizhimost/kvartiry/dolgosrochnaya-arenda-kvartir/dnepr/?search%5Bfilter_float_floor%3Ato%5D=10" \
             --numberOfPages 1 \
             --includes "живот" "питом" \
             --excludes "Без животных" "без животных" "Без питомцев" "без питомцев" "С животными не берем" \
             --maxMinutes 40 \
             --loopSeconds 60
```

### Search items published later than 60 minutes ago in loop each 45 seconds, if found print them and play sound (without check on include, exclude strings):
```
node main.js --baseUrl "https://www.olx.ua/nedvizhimost/kvartiry/dolgosrochnaya-arenda-kvartir/dnepr/?search%5Bfilter_float_floor%3Ato%5D=10" \
             --numberOfPages 1 \
             --maxMinutes 60 \
             --loopSeconds 45
```