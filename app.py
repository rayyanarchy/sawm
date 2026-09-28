from flask import Flask, render_template, request
import joblib
import requests
import numpy as np
from datetime import datetime

app = Flask(__name__)

hydration_model = joblib.load('assets/hydration_model.pkl')

CLOUDY = {116, 119, 122, 143, 248, 260}
SNOW = {179, 227, 230, 323, 326, 329, 332, 335, 338, 350, 368, 371, 374, 377, 392, 395}


def weather_kind(code):
    """Collapse wttr.in weather codes into sunny / cloudy / rain / snow."""
    if code == 113:
        return 'sunny'
    if code in CLOUDY:
        return 'cloudy'
    if code in SNOW:
        return 'snow'
    return 'rain'


@app.route('/')
def index():
    city = request.args.get('city', 'Riyadh')
    country = request.args.get('country', 'Saudi Arabia')
    method = request.args.get('method', '2')
    today = datetime.now().strftime('%d-%m-%Y')

    prayer_url = (
        f"http://api.aladhan.com/v1/timingsByCity"
        f"?city={city}&country={country}&method={method}&date={today}"
    )
    prayer_data = requests.get(prayer_url, timeout=10).json()['data']
    suhoor = prayer_data['timings']['Fajr'].split(' ')[0]
    iftar = prayer_data['timings']['Maghrib'].split(' ')[0]
    timezone = prayer_data['meta']['timezone']

    weather = requests.get(f"http://wttr.in/{city}?format=j1", timeout=10).json()
    current = weather['current_condition'][0]
    temp_c = int(current['temp_C'])
    humidity = int(current['humidity'])
    condition = weather_kind(int(current['weatherCode']))
    condition_text = current['weatherDesc'][0]['value']

    try:
        hydration = hydration_model.predict(np.array([[temp_c, humidity]]))[0]
    except Exception as e:
        print(f"Error predicting hydration: {e}")
        hydration = 2.5

    return render_template(
        'index.html',
        suhoor=suhoor, iftar=iftar, timezone=timezone,
        temp=temp_c, humidity=humidity,
        condition=condition, condition_text=condition_text,
        hydration=round(hydration, 1), method=method,
        city=city, country=country,
    )


if __name__ == '__main__':
    app.run(debug=True)
