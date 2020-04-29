import React, { Component } from 'react';
import { Platform, View, NativeModules, NativeEventEmitter,PermissionsAndroid } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { Container, Header, Content, Footer, FooterTab, Button, Icon, Text, Card, CardItem, Body,Toast,Root} from 'native-base';
import base64 from 'react-native-base64';
import moment from 'moment'; 
let count = 0;
const transactionId ="moniter";
import showToast from './toast'
export default class Ble_test extends Component {
    constructor() {
        super()
        this.manager = new BleManager()
        this.state = {
            deviceid : '', serviceUUID:'', characteristicsUUID : '', text1 : '',makedata : [],showToast: false,
            notificationReceiving : false
        }
    }
    
    componentWillUnmount() {
        this.manager.cancelTransaction(transactionId)
        this.manager.stopDeviceScan();
        this.manager.destroy();
        delete this.manager;
    }
    
    UNSAFE_componentWillMount() {
        this.manager = new BleManager()
        if (Platform.OS === 'android' && Platform.Version >= 23) {
            PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
                if (result) {
                    console.log("Permission is OK");
                    // this.retrieveConnected()
                } else {
                    PermissionsAndroid.requestPermission(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
                        if (result) {
                            console.log("User accept");
                        } else {
                            console.log("User refuse");
                        }
                    });
                }
            });
        }
    }

    getServicesAndCharacteristics(device) {
        return new Promise((resolve, reject) => {
            device.services().then(services => {
                const characteristics = []
                console.log("ashu_1",services)
                services.forEach((service, i) => {
                    service.characteristics().then(c => {
                      console.log("service.characteristics")
                      
                        characteristics.push(c)
                        console.log(characteristics)
                        if (i === services.length - 1) {
                            const temp = characteristics.reduce(
                                (acc, current) => {
                                    return [...acc, ...current]
                                },
                                []
                            )
                            const dialog = temp.find(
                                characteristic =>
                                    characteristic.isWritableWithoutResponse
                            )
                            if (!dialog) {
                                reject('No writable characteristic')
                            }
                            resolve(dialog)
                        }
                      
                    })
                })
            })
        })
    }

    stopNotication(){
        this.manager.cancelTransaction(transactionId)
        this.setState({notificationReceiving:false})
    }

    disconnect(){
        return new Promise((resolve, reject) => {
            this.manager.cancelDeviceConnection(this.state.deviceid).
            then(rest=>{
                console.log(rest);
                let cleanState = {};
                Object.keys(this.state).forEach(x => {
                    if(x=='makedata'){cleanState[x] = []} else{cleanState[x] = null}
                });
                this.setState(cleanState);
            })
            .catch((err)=>console.log("error on cancel connection",err))
       })
    }

    async writeMesage(code, message){
        this.manager.cancelTransaction(transactionId)
        var device= this.state.device;
        const senddata = base64.encode(message);
        if(device)
        {
            device.writeCharacteristicWithResponseForService(this.state.serviceUUID, this.state.characteristicsUUID, senddata).then((characteristic) => {
                
                console.log("write response");
                console.log(characteristic);
                this.alert(message,"success")
                
                //Sent message and start receiving data
                console.log("device")
                console.log(this.state.serviceUUID,"device",this.state.characteristicsUUID)
                console.log(this.state.device)
                let snifferService = null
                var SERVICE_SNIFFER_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
                var SNIFFER_VOLTAGE_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
                
                device.services().then(services => {
                    let voltageCharacteristic = null
                    snifferService = services.filter(service => service.uuid === this.state.serviceUUID)[0]
                    snifferService.characteristics().then(characteristics => {
                        console.log("characteristics characteristics")
                        console.log(characteristics)
                        this.setState({notificationReceiving:true})
                        // voltageCharacteristic is retrieved correctly and data is also seems correct
                        voltageCharacteristic = characteristics.filter(c => c.uuid === characteristics[0].uuid)[0]
                        voltageCharacteristic.monitor((error, c) => {
                            // RECEIVED THE ERROR HERE (voltageCharacteristic.notifiable === true)
                            if(error){
                                console.log("error in monitering",error)  
                                return;
                            }
                            else{
                                // console.log("c",base64.decode(c.value))  
                                const data1 = base64.decode(c.value);
                                var s = data1.split(" ");
                                var s1 = parseInt(s[1]);
                                if(isNaN(s1)) {count++;}
                                else{
                                    if(count == 1){
                                        this.state.makedata.push(<Text key={moment().valueOf()}>{s[0]} : {s1/1000} {"\n"} </Text>);
                                        this.setState({dateTime : "Data Received at : "+moment().format("MMMM Do, h:mm:ss a"),makedata:this.state.makedata}); 
                                    }
                                    if(count == 3){count = 0;this.setState({makedata:[]})}
                                }
                            }
                        },transactionId)
                    }).catch(error => console.log(error))
                })
                return 
            }).catch((error) => {
                this.alert("error in writing"+JSON.stringify(error))
            })
        }
        else{
            this.alert("No device is connected")
        }
    }

        
    alert(message,type="danger"){
        Toast.show({
            text: message,
            buttonText: 'Okay',
            duration: 5000,
            type: type,
            Animated : false
        })
    }
       
    async scanAndConnect() {
        this.setState({text1:"Scanning..."})
        this.manager.startDeviceScan(null, null, (error, device) => {
            console.log("Scanning...");
            if (null) {
                console.log('null')
            }
            if (error) {
                this.alert("Error in scan=> "+error)
                this.setState({text1:""})
                this.manager.stopDeviceScan();
                return
            }
            if( /[_]/g.test( device.name ) ) 
            {
                let nameSplit = device.name.split('_');
                if(nameSplit[0] == 'TAPP'){ //T3X1 //TAPP
                    const serviceUUIDs= device.serviceUUIDs[0]
                    this.setState({text1:"Connecting to "+device.name})
                    this.manager.stopDeviceScan();
                    //listener for disconnection
                   /* this.manager.onDeviceDisconnected(device.id, (error, device) => {
                        console.log(error);
                        console.log("errordddd",device);
                        // if(this.props.device.isConnected) {
                        //     this.scanAndConnect()
                        // }
                        
                    });*/
                    this.manager.connectToDevice(device.id, {autoConnect:true}).then((device) => {
                        (async () => {
                            const services = await device.discoverAllServicesAndCharacteristics()
                            const characteristic = await this.getServicesAndCharacteristics(services)
                            console.log("characteristic")
                            console.log(characteristic)
                            console.log("Discovering services and characteristics",characteristic.uuid);
                            this.setState({"deviceid":device.id, serviceUUID:serviceUUIDs, characteristicsUUID : characteristic.uuid,device:device })
                            this.setState({text1:"Conneted to "+device.name})
                        })();
                        this.setState({device:device})
                        return device.discoverAllServicesAndCharacteristics()
                    }).then((device) => {
                        // return this.setupNotifications(device)
                    }).then(() => {
                        console.log("Listening...")
                    }, (error) => {
                        this.alert("Connection error"+JSON.stringify(error))
                    })
                }
            }
       });
    }


    render() {
        return (
            <Root>
                <Content padder>
                    <View>
                        {this.state.deviceid ? 
                            (
                                <Button warning block onPress={()=>this.disconnect()}>
                                    <Text>Disconnect</Text>
                                </Button>
                            ) : (
                                <Button block onPress={()=>this.scanAndConnect()}>
                                    <Text>Scan for a device</Text>
                                </Button>
                            )
                        }
                    </View>
                    <View style={{alignItems:'center',marginVertical : 10}}>
                        <Text>{this.state.text1}</Text>
                    </View>
                    <Card>
                        <CardItem>
                            <Body>
                                <Text>{this.state.dateTime}{'\n'}{this.state.makedata}</Text>
                            </Body>
                        </CardItem>
                    </Card>
                    
                </Content>
                {this.state.notificationReceiving==true ? (
                    <Button warning block onPress={()=>this.stopNotication()}>
                        <Text>Stop Notification</Text>
                    </Button>
                ) : null}
                
                   
                
                
                <Footer>
                    <FooterTab>
                        <Button  onPress={()=>this.writeMesage("ACK","ACK Writted")}>
                            <Text>ACK</Text>
                        </Button>
                        <Button  onPress={()=>this.writeMesage("ris 0","ris 0 Writted")}>
                            <Text>RIS 0</Text>
                        </Button>
                        <Button  onPress={()=>this.writeMesage("ris 1","ris 1 Writted")}>
                            <Text>RIS 1</Text>
                        </Button>
                    </FooterTab>
                </Footer>
            </Root>
        )    
    }
}
