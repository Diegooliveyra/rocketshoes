import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  });

  const cardPerviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cardPerviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cardPerviousValue, cart]);

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]; //Cria um novo array com os dados do carrinho
      const productExists = cart.find((product) => product.id === productId); //retorna o produto se caso ele existir no carrinho
      const stock = await api.get(`/stock/${productId}`); //recebe o stock do produto selecionado
      const stockAmount = stock.data.amount; //seta a quantidade no stock
      const amount = productExists ? productExists.amount + 1 : 1; //se o produto ja existe, adciona um a mais

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      //Se o produto ja existe, adc um a mais na quantidade
      if (productExists) {
        productExists.amount = amount;

        //Se não existe, adiciona um novo produto
      } else {
        const product = await api.get(`products/${productId}`);
        const newProduct = {
          ...product.data,
          amount,
        };
        updatedCart.push(newProduct);
      }
      setCart(updatedCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const index = updatedCart.findIndex(
        (product) => product.id === productId,
      );
      if (index !== -1) {
        updatedCart.splice(index, 1);
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }
      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExist = updatedCart.find(
        (product) => product.id === productId,
      );

      if (productExist) {
        productExist.amount = amount;
        setCart(updatedCart);
      } else {
        throw Error();
      }

      setCart(updatedCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
