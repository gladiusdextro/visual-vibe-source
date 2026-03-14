interface MercadoPagoCardFormData {
  token: string;
  issuer_id: string;
  payment_method_id: string;
  transaction_amount: number;
  installments: number;
  payer: {
    email: string;
    identification: {
      type: string;
      number: string;
    };
  };
}

interface MercadoPagoCardForm {
  getCardFormData(): MercadoPagoCardFormData;
  unmount(): void;
}

interface MercadoPagoInstance {
  cardForm(options: any): MercadoPagoCardForm;
}

interface Window {
  MercadoPago: new (publicKey: string, options?: { locale?: string }) => MercadoPagoInstance;
}
