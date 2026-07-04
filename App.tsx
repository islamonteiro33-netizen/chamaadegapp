
import React,{useEffect,useMemo,useState}from'react';
import{Alert,FlatList,SafeAreaView,ScrollView,StatusBar as RNStatusBar,StyleSheet,Text,TextInput,TouchableOpacity,Vibration,View}from'react-native';
import{StatusBar}from'expo-status-bar';
import AsyncStorage from'@react-native-async-storage/async-storage';

const API='https://chamabebidas.com.br/api';
const C={bg:'#08090C',panel:'#12151A',panel2:'#1B1E24',line:'#2B3038',text:'#FFF',muted:'#A7ABB4',yellow:'#FFD000',green:'#21D060',red:'#FF3B4E',purple:'#2C1D63',orange:'#FF8A00',blue:'#2F80ED'};

type Order={
  id:any;
  status:string;
  customerName?:string;
  customer_name?:string;
  customer?:any;
  customerPhone?:string;
  customer_phone?:string;
  address?:string;
  delivery_address?:string;
  total?:number;
  total_amount?:number;
  amount?:number;
  items?:any[];
  securityCode?:string;
  security_code?:string;
  pickupCode?:string;
  pickup_code?:string;
  deliveryCode?:string;
  delivery_code?:string;
  paymentMethod?:string;
  payment_method?:string;
};

const DEMO:Order[]=[
  {id:'PED_10193',status:'pending',customerName:'João',customerPhone:'15999999999',address:'Rua Exemplo, 123',total:148.90,paymentMethod:'PIX',securityCode:'7382',items:[{name:'Cerveja lata',qty:10,price:5.5},{name:'Gelo',qty:2,price:10}]},
  {id:'PED_10194',status:'preparing',customerName:'Maria',customerPhone:'15988888888',address:'Centro - Tatuí',total:67.50,paymentMethod:'PIX',securityCode:'2244',items:[{name:'Combo cerveja + gelo',qty:1,price:49.9}]}
];

export default function App(){
  const[screen,setScreen]=useState<'login'|'home'|'details'|'products'|'finance'|'profile'>('login');
  const[storeId,setStoreId]=useState('');
  const[storeName,setStoreName]=useState('');
  const[password,setPassword]=useState('');
  const[orders,setOrders]=useState<Order[]>([]);
  const[selected,setSelected]=useState<Order|null>(null);
  const[demo,setDemo]=useState(false);
  const[filter,setFilter]=useState<'waiting'|'progress'>('waiting');
  const[typed,setTyped]=useState('');

  useEffect(()=>{boot()},[]);
  useEffect(()=>{
    if(screen==='home'){
      load();
      const timer=setInterval(load,15000);
      return()=>clearInterval(timer);
    }
  },[screen,storeId]);

  async function boot(){
    const id=await AsyncStorage.getItem('storeId');
    const nm=await AsyncStorage.getItem('storeName');
    if(id){
      setStoreId(id);
      setStoreName(nm||`Adega #${id}`);
      setScreen('home');
    }
  }

  async function login(){
    if(!storeId.trim())return Alert.alert('Atenção','Digite o ID da adega.');
    const nm=storeName.trim()||`Adega #${storeId}`;
    await AsyncStorage.setItem('storeId',storeId.trim());
    await AsyncStorage.setItem('storeName',nm);
    setStoreName(nm);
    setScreen('home');
  }

  async function logout(){
    await AsyncStorage.clear();
    setScreen('login');
    setOrders([]);
    setSelected(null);
  }

  async function load(){
    if(!storeId)return;
    try{
      let got:Order[]|null=null;
      for(const url of[`${API}/stores/${storeId}/orders`,`${API}/orders?storeId=${storeId}`,`${API}/orders`]){
        try{
          const r=await fetch(url);
          if(!r.ok)continue;
          const d=await r.json();
          const arr=Array.isArray(d)?d:(d.orders||d.data||d.results);
          if(Array.isArray(arr)){got=arr;break;}
        }catch(e){}
      }
      if(got){
        const oldCount=orders.filter(o=>String(o.status)==='pending').length;
        const newCount=got.filter(o=>String(o.status)==='pending').length;
        if(newCount>oldCount)Vibration.vibrate([0,400,150,400,150,700]);
        setOrders(got);
        setDemo(false);
      }else{
        setOrders(DEMO);
        setDemo(true);
      }
    }catch(e){
      setOrders(DEMO);
      setDemo(true);
    }
  }

  function updateLocal(order:Order,status:string){
    const updated={...order,status};
    setOrders(prev=>prev.map(o=>String(o.id)===String(order.id)?updated:o));
    setSelected(updated);
  }

  async function setStatus(order:Order,status:string){
    if(demo){updateLocal(order,status);return;}
    try{
      const r=await fetch(`${API}/orders/${order.id}/status`,{
        method:'PATCH',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({status,storeId})
      });
      if(!r.ok)throw new Error('api');
      updateLocal(order,status);
      load();
    }catch(e){
      Alert.alert('Erro','Não foi possível atualizar. Vou atualizar localmente para não travar.');
      updateLocal(order,status);
    }
  }

  function openDetails(order:Order){
    setSelected(order);
    setTyped('');
    setScreen('details');
  }

  function security(order:Order|null){
    if(!order)return '----';
    return String(order.securityCode||order.security_code||order.pickupCode||order.pickup_code||order.deliveryCode||order.delivery_code||'----');
  }

  function release(order:Order){
    if(typed.trim()!==security(order)){
      Alert.alert('Código incorreto','Digite o número de segurança informado pelo entregador.');
      return;
    }
    setStatus(order,'picked_up');
    Alert.alert('Liberado','Pedido liberado para retirada.');
    setScreen('home');
  }

  function customer(order:Order|null){
    if(!order)return 'Cliente';
    return order.customerName||order.customer_name||order.customer?.name||'Cliente';
  }

  function phone(order:Order|null){
    if(!order)return '';
    return order.customerPhone||order.customer_phone||order.customer?.phone||'';
  }

  function addr(order:Order|null){
    if(!order)return 'Endereço não informado';
    return order.address||order.delivery_address||order.customer?.address||'Endereço não informado';
  }

  function total(order:Order|null){
    if(!order)return 0;
    return Number(order.total||order.total_amount||order.amount||0);
  }

  function pay(order:Order|null){
    if(!order)return 'PIX';
    return order.paymentMethod||order.payment_method||'PIX';
  }

  function itemName(it:any){
    return String(it?.name||it?.title||it?.product_name||it?.product?.name||'Produto');
  }

  function itemQty(it:any){
    return Number(it?.qty||it?.quantity||1);
  }

  function itemPrice(it:any){
    return Number(it?.price||it?.unit_price||it?.product?.price||0);
  }

  const waiting=orders.filter(o=>String(o.status)==='pending').length;
  const progress=orders.filter(o=>['accepted','preparing','ready','calling_driver','driver_accepted'].includes(String(o.status))).length;

  const visible=useMemo(()=>{
    return orders.filter(o=>{
      const st=String(o.status||'');
      if(['delivered','cancelled','finished','completed','picked_up'].includes(st))return false;
      if(filter==='waiting')return st==='pending';
      return ['accepted','preparing','ready','calling_driver','driver_accepted'].includes(st);
    });
  },[orders,filter]);

  if(screen==='login')return(
    <SafeAreaView style={s.bg}>
      <StatusBar style="light"/>
      <RNStatusBar barStyle="light-content" backgroundColor={C.bg}/>
      <ScrollView contentContainerStyle={s.login}>
        <View style={s.logo}><Text style={{fontSize:42}}>🏪</Text></View>
        <Text style={s.title}>Chama Adega</Text>
        <Text style={s.subCenter}>Pedidos em tempo real</Text>
        <Input ph="ID da adega" v={storeId} set={setStoreId}/>
        <Input ph="Nome da adega" v={storeName} set={setStoreName}/>
        <TextInput style={s.input} placeholder="Senha" placeholderTextColor={C.muted} value={password} onChangeText={setPassword} secureTextEntry/>
        <Button title="ENTRAR" onPress={login}/>
      </ScrollView>
    </SafeAreaView>
  );

  if(screen==='details'){
    if(!selected){
      return <SafeAreaView style={s.bg}><Header title="Pedido" back={()=>setScreen('home')}/><Empty title="Pedido não encontrado" text="Volte para a lista de pedidos."/></SafeAreaView>
    }
    const st=String(selected.status||'');
    return(
      <SafeAreaView style={s.bg}>
        <Header title={`Pedido #${selected.id}`} back={()=>setScreen('home')}/>
        <ScrollView contentContainerStyle={{padding:16,paddingBottom:100}}>
          <View style={s.panel}>
            <View style={s.row}>
              <Text style={s.big}>{customer(selected)}</Text>
              <Text style={s.badge}>{st}</Text>
            </View>
            <Text style={s.sub}>{phone(selected)}</Text>
            <Text style={s.sub}>{addr(selected)}</Text>
            <Text style={s.total}>R$ {total(selected).toFixed(2)}</Text>
            <Text style={s.sub}>Pagamento: {pay(selected)}</Text>
          </View>

          <View style={s.codeBox}>
            <Text style={s.sub}>Número de segurança</Text>
            <Text style={s.code}>{security(selected)}</Text>
            <Text style={s.sub}>A adega confere esse número para liberar a retirada.</Text>
          </View>

          <View style={s.panel}>
            <Text style={s.pname}>Itens</Text>
            {(selected.items||[]).length===0?<Text style={s.sub}>Itens não enviados pela API.</Text>:(selected.items||[]).map((it:any,i:number)=>(
              <View key={i} style={s.item}>
                <Text style={s.white}>{itemQty(it)}x {itemName(it)}</Text>
                <Text style={s.sub}>R$ {itemPrice(it).toFixed(2)}</Text>
              </View>
            ))}
          </View>

          <View style={s.panel}>
            <Text style={s.pname}>Ação do pedido</Text>
            {st==='pending'&&(
              <View style={s.actions}>
                <TouchableOpacity style={s.reject} onPress={()=>setStatus(selected,'cancelled')}>
                  <Text style={s.white}>REJEITAR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.accept} onPress={()=>setStatus(selected,'accepted')}>
                  <Text style={s.acceptText}>ACEITAR</Text>
                </TouchableOpacity>
              </View>
            )}
            {st==='accepted'&&<Button title="COMEÇAR PREPARO" onPress={()=>setStatus(selected,'preparing')}/>}
            {st==='preparing'&&<Button title="PEDIDO PRONTO" onPress={()=>setStatus(selected,'ready')}/>}
            {st==='ready'&&<Button title="CHAMAR ENTREGADOR" onPress={()=>setStatus(selected,'calling_driver')}/>}
            {['calling_driver','driver_accepted'].includes(st)&&(
              <View>
                <TextInput style={s.input} placeholder="Digite o código informado pelo entregador" placeholderTextColor={C.muted} value={typed} onChangeText={setTyped} keyboardType="numeric"/>
                <Button title="LIBERAR RETIRADA" onPress={()=>release(selected)}/>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if(screen==='products')return(
    <SafeAreaView style={s.bg}>
      <Header title="Produtos" back={()=>setScreen('home')}/>
      <Page title="Produtos e estoque" text="Adicionar, remover, editar, estoque e ON/OFF ficam aqui."/>
      <Nav screen={screen} setScreen={setScreen}/>
    </SafeAreaView>
  );

  if(screen==='finance')return(
    <SafeAreaView style={s.bg}>
      <Header title="Financeiro" back={()=>setScreen('home')}/>
      <Page title="Financeiro" text="Faturamento, taxa da plataforma, repasse e solicitação de saque."/>
      <Nav screen={screen} setScreen={setScreen}/>
    </SafeAreaView>
  );

  if(screen==='profile')return(
    <SafeAreaView style={s.bg}>
      <Header title="Perfil da adega" back={()=>setScreen('home')}/>
      <ScrollView contentContainerStyle={{padding:16}}>
        <View style={s.panel}>
          <Text style={s.big}>{storeName||`Adega #${storeId}`}</Text>
          <Text style={s.sub}>ID: {storeId}</Text>
          <Text style={demo?s.warn:s.green}>{demo?'Modo demonstração':'Conectado à API'}</Text>
          <Button title="SAIR" onPress={logout}/>
        </View>
      </ScrollView>
      <Nav screen={screen} setScreen={setScreen}/>
    </SafeAreaView>
  );

  return(
    <SafeAreaView style={s.bg}>
      <View style={s.top}>
        <View>
          <Text style={s.hello}>{storeName||`Adega #${storeId}`}</Text>
          <Text style={demo?s.warn:s.green}>{demo?'Modo demonstração':'Conectado à API'}</Text>
        </View>
        <TouchableOpacity onPress={()=>setScreen('profile')}><Text style={s.gear}>⚙</Text></TouchableOpacity>
      </View>

      <View style={s.statusTabs}>
        <TouchableOpacity style={[s.statusTab,filter==='waiting'&&s.statusOn]} onPress={()=>setFilter('waiting')}>
          <Text style={filter==='waiting'?s.tabTextOn:s.tabText}>Em espera ({waiting})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.statusTab,filter==='progress'&&s.statusOn]} onPress={()=>setFilter('progress')}>
          <Text style={filter==='progress'?s.tabTextOn:s.tabText}>Em percurso ({progress})</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(i)=>String(i.id)}
        contentContainerStyle={{padding:16,paddingBottom:95}}
        ListEmptyComponent={<Empty title={filter==='waiting'?'Nenhum pedido em espera':'Nenhum pedido em percurso'} text="Pedidos finalizados somem desta tela."/>}
        renderItem={({item})=><OrderCard order={item} customer={customer} addr={addr} total={total} pay={pay} code={security} open={()=>openDetails(item)} setStatus={setStatus}/>}
      />
      <Nav screen={screen} setScreen={setScreen}/>
    </SafeAreaView>
  );
}

function OrderCard({order,customer,addr,total,pay,code,open,setStatus}:any){
  const st=String(order.status||'');
  return(
    <View style={s.order}>
      <TouchableOpacity onPress={open}>
        <View style={s.row}>
          <Text style={s.orderTitle}>Pedido #{order.id}</Text>
          <Text style={s.badge}>{st}</Text>
        </View>
        <Text style={s.pname}>{customer(order)}</Text>
        <Text style={s.sub}>{addr(order)}</Text>
        <View style={s.infoRow}>
          <Text style={s.price}>R$ {total(order).toFixed(2)}</Text>
          <Text style={s.pay}>{pay(order)}</Text>
        </View>
        <View style={s.codeMini}>
          <Text style={s.sub}>Código</Text>
          <Text style={s.codeSmall}>{code(order)}</Text>
        </View>
      </TouchableOpacity>

      {st==='pending'&&(
        <View style={s.actions}>
          <TouchableOpacity style={s.reject} onPress={()=>setStatus(order,'cancelled')}>
            <Text style={s.white}>REJEITAR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.accept} onPress={()=>setStatus(order,'accepted')}>
            <Text style={s.acceptText}>ACEITAR</Text>
          </TouchableOpacity>
        </View>
      )}
      {st!=='pending'&&<Button title="ABRIR PEDIDO" onPress={open}/>}
    </View>
  );
}

function Page({title,text}:any){
  return <View style={s.page}><Text style={s.big}>{title}</Text><Text style={s.sub}>{text}</Text></View>
}
function Empty({title,text}:any){
  return <View style={s.empty}><Text style={s.big}>{title}</Text><Text style={s.sub}>{text}</Text></View>
}
function Input({ph,v,set}:any){
  return <TextInput style={s.input} placeholder={ph} placeholderTextColor={C.muted} value={v} onChangeText={set}/>
}
function Button({title,onPress}:any){
  return <TouchableOpacity style={s.btn} onPress={onPress}><Text style={s.btnText}>{title}</Text></TouchableOpacity>
}
function Header({title,back}:any){
  return <View style={s.header}><TouchableOpacity onPress={back}><Text style={s.back}>‹</Text></TouchableOpacity><Text style={s.htitle}>{title}</Text><Text style={s.back}> </Text></View>
}
function Nav({screen,setScreen}:any){
  return(
    <View style={s.nav}>
      <TouchableOpacity onPress={()=>setScreen('home')}><Text style={screen==='home'?s.navA:s.navT}>📦{'\n'}Pedidos</Text></TouchableOpacity>
      <TouchableOpacity onPress={()=>setScreen('products')}><Text style={screen==='products'?s.navA:s.navT}>🧃{'\n'}Produtos</Text></TouchableOpacity>
      <TouchableOpacity onPress={()=>setScreen('finance')}><Text style={screen==='finance'?s.navA:s.navT}>💰{'\n'}Financeiro</Text></TouchableOpacity>
      <TouchableOpacity onPress={()=>setScreen('profile')}><Text style={screen==='profile'?s.navA:s.navT}>⚙{'\n'}Perfil</Text></TouchableOpacity>
    </View>
  )
}

const s=StyleSheet.create({
bg:{flex:1,backgroundColor:C.bg},
login:{flexGrow:1,justifyContent:'center',padding:24},
logo:{width:92,height:92,borderRadius:46,backgroundColor:C.yellow,alignItems:'center',justifyContent:'center',alignSelf:'center',marginBottom:22},
title:{color:C.text,fontSize:31,fontWeight:'900',textAlign:'center'},
subCenter:{color:C.muted,textAlign:'center',fontWeight:'700',marginBottom:18},
sub:{color:C.muted,fontWeight:'700',marginTop:4},
input:{backgroundColor:C.panel2,color:C.text,borderRadius:12,padding:16,marginTop:12,borderWidth:1,borderColor:C.line},
btn:{backgroundColor:C.yellow,borderRadius:12,padding:16,alignItems:'center',marginTop:14},
btnText:{color:'#111',fontWeight:'900'},
top:{paddingTop:45,paddingHorizontal:18,paddingBottom:14,backgroundColor:C.bg,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
hello:{color:C.text,fontSize:22,fontWeight:'900'},
green:{color:C.green,fontWeight:'900'},
warn:{color:C.orange,fontWeight:'900'},
gear:{color:C.yellow,fontSize:26},
statusTabs:{flexDirection:'row',gap:10,paddingHorizontal:16,paddingBottom:12},
statusTab:{flex:1,backgroundColor:C.panel,borderRadius:14,padding:14,alignItems:'center',borderWidth:1,borderColor:C.line},
statusOn:{backgroundColor:C.yellow},
tabText:{color:C.text,fontWeight:'900'},
tabTextOn:{color:'#111',fontWeight:'900'},
order:{backgroundColor:C.panel,borderRadius:20,padding:16,marginBottom:14,borderWidth:1,borderColor:C.line},
row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},
orderTitle:{color:C.text,fontSize:20,fontWeight:'900'},
badge:{color:C.yellow,fontWeight:'900'},
pname:{color:C.text,fontSize:17,fontWeight:'900',marginTop:10},
infoRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:10},
price:{color:C.text,fontWeight:'900',fontSize:26},
pay:{color:C.green,fontWeight:'900'},
codeMini:{backgroundColor:C.panel2,borderRadius:14,padding:12,marginTop:14,borderWidth:1,borderColor:C.line,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
codeSmall:{color:C.yellow,fontSize:24,fontWeight:'900',letterSpacing:4},
codeBox:{backgroundColor:C.panel2,borderRadius:16,padding:14,marginTop:14,borderWidth:1,borderColor:C.line},
code:{color:C.yellow,fontSize:34,fontWeight:'900',letterSpacing:8,marginTop:4},
item:{flexDirection:'row',justifyContent:'space-between',paddingVertical:10,borderBottomWidth:1,borderBottomColor:C.line},
white:{color:C.text,fontWeight:'900'},
actions:{flexDirection:'row',gap:10,marginTop:14},
reject:{flex:1,backgroundColor:C.red,borderRadius:12,padding:15,alignItems:'center'},
accept:{flex:1,backgroundColor:C.yellow,borderRadius:12,padding:15,alignItems:'center'},
acceptText:{color:'#111',fontWeight:'900'},
empty:{backgroundColor:C.panel,borderRadius:20,padding:24,alignItems:'center',borderWidth:1,borderColor:C.line},
big:{color:C.text,fontSize:24,fontWeight:'900'},
total:{color:C.text,fontSize:28,fontWeight:'900',marginTop:12},
page:{margin:16,backgroundColor:C.panel,borderRadius:20,padding:20,borderWidth:1,borderColor:C.line},
panel:{backgroundColor:C.panel,borderRadius:20,padding:18,marginBottom:14,borderWidth:1,borderColor:C.line},
header:{height:68,backgroundColor:C.bg,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18},
back:{color:C.text,fontSize:38},
htitle:{color:C.text,fontSize:18,fontWeight:'900'},
nav:{position:'absolute',left:0,right:0,bottom:0,height:66,backgroundColor:'rgba(16,16,18,.98)',flexDirection:'row',justifyContent:'space-around',alignItems:'center',borderTopWidth:1,borderTopColor:C.line},
navT:{color:C.muted,textAlign:'center',fontSize:11,fontWeight:'800'},
navA:{color:C.yellow,textAlign:'center',fontSize:11,fontWeight:'900'}
});
