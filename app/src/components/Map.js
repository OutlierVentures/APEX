import React, { Component } from 'react';
import GoogleMapReact from 'google-map-react';

class SimpleMap extends Component {
  static defaultProps = {
    center: {
      lat: 59.95,
      lng: 30.33
    },
    zoom: 11
  };

  render() {
    return (
      // Important! Always set the container height explicitly
      <div style={{ height: '100vh', width: '100%' }}>
        <GoogleMapReact
          bootstrapURLKeys={{ key: "AIzaSyCd2xxw5-95c7a_a2JNO4O47JxhJLGQiOg" }}
          defaultCenter={{ lat: 59.95, lng: 30.33}}
          defaultZoom={11}
        >
        </GoogleMapReact>
      </div>
    );
  }
}

export default SimpleMap;




