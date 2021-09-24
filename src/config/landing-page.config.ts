export const LANDING_PAGE = {
  '421': {
    applicable: true,
    banner_image: {
      applicable: false,
      url: ""
    },
    slides: [
      {
        src: "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_banner/miami.png",
        location: {
          from: {
            airport_code: 'NYC'
          },
          to: {
            airport_code: 'MIA',
            hotel_option: {
              title: "Miami Beach, Florida, United States",
              city: "Miami Beach",
              banner: "Miami",
              state: "Florida",
              country: "United States",
              type: "city",
              hotel_id: "",
              city_id: "800047419",
              geo_codes: {
                lat: "25.7903",
                long: "-80.1303"
              }
            }
          }
        }
      },
      {
        src: "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_banner/lasvegas.png",
        location: {
          from: {
            airport_code: 'NYC'
          },
          to: {
            airport_code: 'LAS',
            hotel_option: {
              title: "Las Vegas, Nevada, United States",
              city: "Las Vegas",
              banner: "Las Vegas",
              state: "Nevada",
              country: "United States",
              type: "city",
              hotel_id: "",
              city_id: "800049030",
              geo_codes: {
                lat: "36.1190",
                long: "-115.1680"
              }
            }
          }
        }
      },
      {
        src: "http://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_banner/cancun.png",
        location: {
          from: {
            airport_code: 'NYC'
          },
          to: {
            airport_code: 'CUN',
            hotel_option: {
              title: "Cancún, Mexico",
              city: "Cancún",
              banner: "Cancun",
              state: "",
              country: "Mexico",
              type: "city",
              hotel_id: "",
              city_id: "800026864",
              geo_codes: {
                lat: "21.1613",
                long: "-86.8341"
              }
            }
          }
        }
      }
    ],
    deals: {
      flight: [
        {
          from: { "code": "NYC", "name": "All Airports", "city": "New York", "country": "USA", "key": "N" },
          to: { "code": "PUJ", "name": "Punta Cana Intl.", "city": "Punta Cana", "country": "Dominican Republic", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/puntacana.png", "key": "P" }
        },
        {
          from: { "code": "NYC", "name": "All Airports", "city": "New York", "country": "USA", "key": "N" },
          to: { "code": "TPA", "name": "Tampa Intl.", "city": "Tampa", "country": "USA", "key": "T", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/tampa.png" }
        },
        {
          from: { "code": "NYC", "name": "All Airports", "city": "New York", "country": "USA", "key": "N" },
          to: { "code": "CUN", "name": "Cancun Intl.", "city": "Cancun", "country": "Mexico", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/cancun.png", "key": "C" }
        },
        {
          from: { "code": "NYC", "name": "All Airports", "city": "New York", "country": "USA", "key": "N" },
          to: { "code": "MCO", "name": "Orlando Intl.", "city": "Orlando", "country": "USA", "key": "O", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/orlando.png" }
        },
        {
          from: { "code": "NYC", "name": "All Airports", "city": "New York", "country": "USA", "key": "N" },
          to: { "code": "LAS", "name": "Mc Carran Intl", "city": "Las Vegas", "country": "USA", "key": "L", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/lasvegas.png" }
        },
        {
          from: { "code": "NYC", "name": "All Airports", "city": "New York", "country": "USA", "key": "N" },
          to: { "code": "PUJ", "name": "Denver Intl.", "city": "Denver", "country": "USA", "key": "D", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/denver.png" }
        },
        {
          from: { "code": "NYC", "name": "All Airports", "city": "New York", "country": "USA", "key": "N" },
          to: { "code": "MIA", "name": "Miami Intl. Arpt.", "city": "Miami", "country": "USA", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/miami.png", "key": "M" },
        },
        {
          from: { "code": "NYC", "name": "All Airports", "city": "New York", "country": "USA", "key": "N" },
          to: { "code": "TUY", "name": "Tulum", "city": "Tulum", "country": "Mexico", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/tulum.png", "key": "C" }
        },
      ],
      hotel: [
        {
          location: { "title": "Punta Cana, Dominican Republic", "city": "Punta Cana", "state": "", "country": "Dominican Republic", "type": "city", "hotel_id": "", "city_id": "800013751", "lat": "18.6149", "long": "-68.3884", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/puntacana.png", "city_names": ["Punta Cana"] }
        },
        {
          location: { "title": "Tampa, Florida, United States", "city": "Tampa", "state": "Florida", "country": "United States", "type": "city", "hotel_id": "", "city_id": "800047518", "lat": "27.9472", "long": "-82.4586", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/tampa.png", "city_names": ["Tampa"] }
        },
        {
          location: { "title": "Cancún, Mexico", "city": "Cancún", "city_id": "800026864", "state": "", "country": "Mexico", "type": "city", "hotel_id": "", "lat": "21.1613", "long": "-86.8341", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/cancun.png", "city_names": ["Cancún"] }
        },
        {
          location: { "title": "Orlando, Florida, United States", "city": "Orlando", "state": "Florida", "country": "United States", "type": "city", "hotel_id": "", "city_id": "800047448", "lat": "28.5353", "long": "-81.3833", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/orlando.png", "city_names": ["Orlando"] }
        },
        {
          location: { "title": "Las Vegas, Nevada, United States", "city": "Las Vegas", "state": "Nevada", "country": "United States", "type": "city", "hotel_id": "", "city_id": "800049030", "lat": "36.1190", "long": "-115.1680", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/lasvegas.png", "city_names": ["Las Vegas"] }
        },
        {
          location: { "title": "Denver, Colorado, United States", "city": "Denver", "state": "Colorado", "country": "United States", "type": "city", "hotel_id": "", "city_id": "800047125", "lat": "39.7458", "long": "-104.9932", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/denver.png", "city_names": ["Denver City", "Denver"] }
        },
        {
          location: { "title": "Miami Beach, Florida, United States", "city": "Miami Beach", "city_id": "800047419", "state": "", "country": "United States", "type": "city", "hotel_id": "", "lat": "25.7903", "long": "-80.1303", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/miami.png", "city_names": ["Miami Beach", "Miami Gardens", "Miami Lakes", "Miami Springs", "Miami"] }
        },
        {
          location: { "title": "Tulum, Quintana Roo, Mexico", "city": "Tulum", "state": "Quintana Roo", "country": "Mexico", "type": "city", "hotel_id": "", "city_id": "800026663", "lat": "20.2107", "long": "-87.4630", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/tulum.png", "city_names": ["Tulum"] }
        }
      ],
      flight_offer_location: [
        "EWR-CUN",
        "EWR-DEN",
        "EWR-FLL",
        "EWR-LAS",
        "EWR-MCO",
        "EWR-MIA",
        "EWR-PBI",
        "EWR-PUJ",
        "EWR-RSW",
        "EWR-TPA",
        "JFK-CUN",
        "JFK-FLL",
        "JFK-LAS",
        "JFK-MCO",
        "JFK-MIA",
        "JFK-PUJ",
        "JFK-TPA",
        "LGA-CUN",
        "LGA-DEN",
        "LGA-FLL",
        "LGA-MCO",
        "LGA-MIA",
        "LGA-PBI",
        "LGA-PUJ"
      ]
    },
    promotional: {
      min_promotional_day: 91,
      max_promotional_day: 365,
    },
    payment_frequency_options: {
      weekly: { applicable: true, visibilty: 'yes' },
      biweekly: { applicable: false, visibilty: 'gray_out' },
      monthly: { applicable: false, visibilty: 'gray_out' }
    },
    down_payment_options: {
      0: { applicable: true, visibilty: 'yes', amount: 9.99 },
      1: { applicable: false, visibilty: 'none', amount: 0 },
      2: { applicable: false, visibilty: 'none', amount: 0 }
    },
    discount: {
      applicable: true,
      type: 'flat', // [percentage,flat]
      amount: 20
    }
  },
  'antinoti': {
    applicable: true,
    slides: [
      {
        src: "https://d2q1prebf1m2s9.cloudfront.net/assets/images/hero-image.jpg",
        location: {
          from: {
            airport_code: ''
          },
          to: {
            airport_code: '',
            hotel_option: {
              title: "",
              city: "",
              banner: "",
              state: "",
              country: "",
              type: "",
              hotel_id: "",
              city_id: "",
              geo_codes: {
                lat: "",
                long: ""
              }
            }
          }
        }
      }
    ],
    deals: {
      flight: [
        {
          from: { "code": "NYC", "name": "All Airports", "city": "New York", "country": "USA", "key": "N" },
          to: { "name": "La Union", "code": "POP", "city": "Puerto Plata", "country": "Dominican Republic", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/tampa.png" }
        },
        {
          from: { "code": "NYC", "name": "All Airports", "city": "New York", "country": "USA", "key": "N" },
          to: { "code": "PUJ", "name": "Punta Cana Intl.", "city": "Punta Cana", "country": "Dominican Republic", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/puntacana.png", "key": "P" }
        },
        {
          from: { "code": "NYC", "name": "All Airports", "city": "New York", "country": "USA", "key": "N" },
          to: {
            "name": "All Airports",
            "code": "SDQ",
            "latitude": "18.43",
            "longitude": "-69.67",
            "city": "Santo Domingo",
            "country": "Dominican Republic",
            "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/cancun.png"
          }
        },
        {
          from: {
            "name": "All Airports",
            "code": "SDQ",
            "latitude": "18.43",
            "longitude": "-69.67",
            "city": "Santo Domingo",
            "country": "Dominican Republic",
            "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/cancun.png"
          },
          to: { "code": "NYC", "name": "All Airports", "city": "New York", "country": "USA", "key": "N" ,"image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/cancun.png"},
        },
        {
          from: {
            "name": "All Airports",
            "code": "SDQ",
            "latitude": "18.43",
            "longitude": "-69.67",
            "city": "Santo Domingo",
            "country": "Dominican Republic",
            "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/cancun.png"
          },
          to: { "code": "MAD", "name": "Barajas", "city": "Madrid", "country": "Spain", "key": "M" ,"image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/cancun.png"},
        },
        {
          from: {
            "name": "All Airports",
            "code": "SDQ",
            "latitude": "18.43",
            "longitude": "-69.67",
            "city": "Santo Domingo",
            "country": "Dominican Republic",
            "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/cancun.png"
          },
          to:{
            "name": "All Airports",
            "code": "ORL",
            "latitude": "28.55",
            "longitude": "-81.33",
            "city": "Orlando",
            "country": "USA",
            "key": "O",
            "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/cancun.png"
          }
        },
        {
          from: {
            "name": "All Airports",
            "code": "SDQ",
            "latitude": "18.43",
            "longitude": "-69.67",
            "city": "Santo Domingo",
            "country": "Dominican Republic",
            "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/cancun.png"
          },
          to: { "code": "MIA", "name": "Miami Intl. Arpt.", "city": "Miami", "country": "USA", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/miami.png", "key": "M" },

        }
      ],
      hotel: [
        {
          location: { "title": "Punta Cana, Dominican Republic", "city": "Punta Cana", "state": "", "country": "Dominican Republic", "type": "city", "hotel_id": "", "city_id": "800013751", "lat": "18.6149", "long": "-68.3884", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/puntacana.png", "city_names": ["Punta Cana"] }
        },
        {
          location:{
            "title": "Puerto Plata",
            "city": "Puerto Plata",
            "state": "",
            "type": "city",
            "country": "Dominican Republic",
            "hotel_id": "",
            "city_id": "800002570",
            "lat": "19.8009",
            "long": "-70.6900",
             "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/cancun.png",
            "city_names": [
              "Cancún"
            ]
          }
        },
        {
          location: { "title": "Miami Beach, Florida, United States", "city": "Miami Beach", "city_id": "800047419", "state": "", "country": "United States", "type": "city", "hotel_id": "", "lat": "25.7903", "long": "-80.1303", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/miami.png", "city_names": ["Miami Beach", "Miami Gardens", "Miami Lakes", "Miami Springs", "Miami"] },
        },
        {
          location:{
            "title": "Boston Harbor Hotel, Boston, MA, US",
            "city": "Boston",
            "state": "MA",
            "country": "US",
            "type": "hotel",
            "hotel_id": "700255396",
            "lat": "42.3563",
            "long": "-71.0504",
            "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/cancun.png",
            "city_names": [
              "Boston "
            ]
          }
        },
        {
          location:{
            "title": "New York City, New York, United States",
            "city": "New York City",
            "state": "New York",
            "country": "United States",
            "type": "city",
            "hotel_id": "",
            "city_id": "800049480",
            "lat": "40.7681",
            "long": "-73.9819",
            "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/cancun.png",
            "city_names": [
              "New York City"
            ]
          }
        },
        {
          location: { "title": "Madrid, Spain", "city": "Madrid", "city_id": "800039716", "state": "", "country": "Spain", "type": "city", "hotel_id": "", "lat": "40.4167", "long": "-3.7034", "image": "https://d2q1prebf1m2s9.cloudfront.net/assets/images/lp_deals/cancun.png", "city_names": ["Madrid"] }
        },

      ],
      flight_offer_location: [
        "EWR-POP",
        "JFK-POP",
        "LGA-POP",
        "EWR-PUJ",
        "JFK-PUJ",
        "LGA-PUJ",
        "EWR-SDQ",
        "JFK-SDQ",
        "LGA-SDQ",
        "SDQ-EWR",
        "SDQ-JFK",
        "SDQ-LGA",
        "SDQ-MIA",
        "SDQ-PBI",
        "SDQ-MCO",
      ]
    },
    promotional: {
      min_promotional_day: 61,
      max_promotional_day: 365,
    },
    payment_frequency_options: {
      weekly: { applicable: true, visibilty: 'yes' },
      biweekly: { applicable: false, visibilty: 'gray_out' },
      monthly: { applicable: false, visibilty: 'gray_out' }
    },
    down_payment_options: {
      0: { applicable: true, visibilty: 'yes', amount: 8.99 },
      1: { applicable: false, visibilty: 'none', amount: 0 },
      2: { applicable: false, visibilty: 'none', amount: 0 }
    },
    discount: {
      applicable: true,
      type: 'flat', // [percentage,flat]
      amount: 20
    }
  }
}



