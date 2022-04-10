# Search items by text on olx

Allows filtering olx items by checking strings that it must include and ones that it must NOT include.
Also, these actions can be looped and limited by time passed since item publication date.

## Before usage:

- install nodejs (`brew install npm` on Mac);
- navigate to root folder and run `npm install`;

## Usage examples:

### Search items and print:
```
node main.js --baseUrl "https://www.olx.ua/nedvizhimost/kvartiry/dolgosrochnaya-arenda-kvartir/2-komnaty/dnepr/?search%5Bfilter_float_floor%3Ato%5D=10" \
             --numberOfPages 5 \
             --includes "живот" "питом" \
             --excludes "Без животных" "без животных" "Без питомцев" "без питомцев" "С животными не берем"
```

### Search items published latter then 60 minutes ago and print:
```
node main.js --baseUrl "https://www.olx.ua/nedvizhimost/kvartiry/dolgosrochnaya-arenda-kvartir/2-komnaty/dnepr/?search%5Bfilter_float_floor%3Ato%5D=10" \
             --numberOfPages 5 \
             --includes "живот" "питом" \
             --excludes "Без животных" "без животных" "Без питомцев" "без питомцев" "С животными не берем" \
             --maxMinutes 60
```

### Search items published latter then 60 minutes ago in loop each 90 seconds, if found print them and play sound:
```
node main.js --baseUrl "https://www.olx.ua/nedvizhimost/kvartiry/dolgosrochnaya-arenda-kvartir/2-komnaty/dnepr/?search%5Bfilter_float_floor%3Ato%5D=10" \
             --numberOfPages 5 \
             --includes "живот" "питом" \
             --excludes "Без животных" "без животных" "Без питомцев" "без питомцев" "С животными не берем" \
             --maxMinutes 60 \
             --loopSeconds 90
```