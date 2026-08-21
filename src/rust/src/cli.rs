use clap::Parser;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
pub struct Args {
    #[arg(short, long, env = "CV_PORT", default_value_t = 3000)]
    pub port: u16,

    #[arg(short, long, env = "CV_BIND", default_value = "127.0.0.1")]
    pub bind: String,

    #[arg(short, long, env = "CV_HDF5_PATH", default_value = "cv_data.h5")]
    pub file: String,
}
