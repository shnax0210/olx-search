# Search items by text on olx

Allows filtering olx items by checking strings that it must include and ones that it must NOT include.

## Before usage:

- install nodejs (`brew install npm` on Mac);
- navigate to root folder and run `npm install`;

## Usage examples:

```
node main.js --baseUrl "https://www.olx.ua/nedvizhimost/kvartiry/dolgosrochnaya-arenda-kvartir/2-komnaty/dnepr/?search%5Bfilter_float_floor%3Ato%5D=10" \
             --numberOfPages 5 \
             --includes "живот" "питом" \
             --excludes "Без животных" "без животных" "Без питомцев" "без питомцев" "С животными не берем"
```